import hashlib
from urllib.parse import urljoin
from django.db import IntegrityError, transaction

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login as auth_login, logout as auth_logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .models import Practice, PracticeMembership, StakeholderProfile

User = get_user_model()
VERIFICATION_SALT = "molarflow.stakeholder.email-verification.v1"


class AuthIPThrottle(SimpleRateThrottle):
    """Apply a hard per-IP limit, even when an attacker rotates addresses."""
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class AuthIdentifierThrottle(SimpleRateThrottle):
    """Also limit attempts for one account across different source IPs."""
    def get_cache_key(self, request, view):
        identifier = str(request.data.get("email", "")).strip().lower()
        if not identifier:
            return None
        digest = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}


class LoginIPThrottle(AuthIPThrottle):
    scope = "auth_login"


class LoginIdentifierThrottle(AuthIdentifierThrottle):
    scope = "auth_login_identity"


class SignupIPThrottle(AuthIPThrottle):
    scope = "auth_signup"


class SignupIdentifierThrottle(AuthIdentifierThrottle):
    scope = "auth_signup_identity"


class RecoveryIPThrottle(AuthIPThrottle):
    scope = "auth_recovery"


class RecoveryIdentifierThrottle(AuthIdentifierThrottle):
    scope = "auth_recovery_identity"


def send_verification_email(user):
    token = signing.dumps(
        {"user_id": user.pk, "email": user.email},
        salt=VERIFICATION_SALT,
        compress=True,
    )
    link = urljoin(settings.FRONTEND_URL + "/", "verify-email?token=" + token)
    send_mail(
        "Verify your MolarFlow account",
        "Hi {},\n\nVerify your email address to access your dental workspace:\n{}\n\nThis link expires in 24 hours. If you did not request this account, you can ignore this email.".format(
            user.get_full_name() or user.get_username(), link
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = urljoin(settings.FRONTEND_URL + "/", "reset-password/{}/{}".format(uid, token))
    send_mail(
        "Reset your MolarFlow password",
        "We received a request to reset your MolarFlow password. Use this link within one hour:\n{}\n\nIf you did not request a reset, you can ignore this email.".format(link),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def is_verified(user):
    return bool(
        user.is_active
        and hasattr(user, "stakeholder_profile")
        and user.stakeholder_profile.email_verified_at
    )


def auth_user_payload(user):
    profile = getattr(user, "stakeholder_profile", None)
    memberships = PracticeMembership.objects.filter(user=user, is_active=True).select_related("practice")
    return {
        "id": user.pk,
        "email": user.email,
        "username": user.get_username(),
        "full_name": profile.full_name if profile else user.get_full_name(),
        "practices": [
            {"id": membership.practice_id, "name": membership.practice.name, "role": membership.role}
            for membership in memberships
        ],
    }


@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({"csrfToken": get_token(request)})


class ProviderConfigurationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({
            "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "microsoft": bool(settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET),
            "apple": bool(settings.APPLE_SERVICE_ID and settings.APPLE_KEY_ID and settings.APPLE_TEAM_ID and settings.APPLE_PRIVATE_KEY),
        })


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_verified(request.user):
            return Response({"detail": "Verify your email address to continue."}, status=status.HTTP_403_FORBIDDEN)
        return Response(auth_user_payload(request.user))


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SignupIPThrottle, SignupIdentifierThrottle]

    def post(self, request):
        data = request.data
        full_name = str(data.get("full_name", "")).strip()
        clinic_name = str(data.get("clinic_name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        username = str(data.get("username", "")).strip()
        password = data.get("password", "")
        password_confirm = data.get("password_confirm", "")
        if not all([full_name, clinic_name, email, username, password, password_confirm]):
            return Response({"detail": "Complete all required fields."}, status=status.HTTP_400_BAD_REQUEST)
        if data.get("terms_accepted") is not True:
            return Response({"terms_accepted": ["Accept the Terms of Service and Privacy Policy to continue."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(full_name) > 160 or len(clinic_name) > 160:
            return Response({"detail": "Names must be 160 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": ["An account already uses this email. Sign in or recover your account."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username__iexact=username).exists():
            return Response({"username": ["That username is already taken."]}, status=status.HTTP_400_BAD_REQUEST)
        from django.core.validators import validate_email
        try:
            validate_email(email)
        except ValidationError:
            return Response({"email": ["Enter a valid work email address."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(email) > 254:
            return Response({"email": ["Email addresses must be 254 characters or fewer."]}, status=status.HTTP_400_BAD_REQUEST)
        if len(username) > 150:
            return Response({"username": ["Usernames must be 150 characters or fewer."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            User._meta.get_field("username").run_validators(username)
        except ValidationError:
            return Response({"username": ["Use a valid username without unsupported characters."]}, status=status.HTTP_400_BAD_REQUEST)
        if password != password_confirm:
            return Response({"password_confirm": ["Passwords do not match."]}, status=status.HTTP_400_BAD_REQUEST)
        first_name, _, last_name = full_name.partition(" ")
        candidate_user = User(username=username, email=email, first_name=first_name, last_name=last_name)
        try:
            validate_password(password, candidate_user)
        except ValidationError as error:
            return Response({"password": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=False,
                )
                StakeholderProfile.objects.create(
                    user=user,
                    full_name=full_name,
                    normalized_email=email,
                    terms_accepted_at=timezone.now(),
                )
                practice = Practice.objects.create(
                    name=clinic_name,
                    region="Unassigned",
                    stage=Practice.Stage.ONBOARDING,
                )
                PracticeMembership.objects.create(
                    user=user,
                    practice=practice,
                    role=PracticeMembership.Role.STAKEHOLDER,
                    is_active=False,
                )
        except IntegrityError:
            # Avoid turning a race against either unique constraint into a 500.
            return Response({"detail": "An account already uses that email or username."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            send_verification_email(user)
        except Exception:
            return Response(
                {"detail": "Your account is saved but we could not send the verification email. Use Resend verification or try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"detail": "Check your email for a verification link before signing in."},
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RecoveryIPThrottle, RecoveryIdentifierThrottle]

    def post(self, request):
        token = str(request.data.get("token", ""))
        try:
            payload = signing.loads(token, salt=VERIFICATION_SALT, max_age=settings.EMAIL_VERIFICATION_TIMEOUT)
            user = User.objects.get(pk=payload.get("user_id"), email__iexact=payload.get("email", ""))
        except signing.SignatureExpired:
            return Response({"detail": "This verification link expired. Request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        except (signing.BadSignature, User.DoesNotExist, TypeError, ValueError):
            return Response({"detail": "This verification link is invalid. Request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        profile = getattr(user, "stakeholder_profile", None)
        if profile is None:
            return Response({"detail": "This verification link is invalid."}, status=status.HTTP_400_BAD_REQUEST)
        profile.email_verified_at = profile.email_verified_at or timezone.now()
        profile.save(update_fields=["email_verified_at"])
        user.is_active = True
        user.save(update_fields=["is_active"])
        PracticeMembership.objects.filter(user=user).update(is_active=True)
        auth_login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response({"detail": "Your email is verified. Your dental workspace is ready."})


@method_decorator(csrf_protect, name="dispatch")
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RecoveryIPThrottle, RecoveryIdentifierThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=False).first()
        if user and hasattr(user, "stakeholder_profile"):
            try:
                send_verification_email(user)
            except Exception:
                pass
        return Response({"detail": "If the account needs verification, a new link has been sent."})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginIPThrottle, LoginIdentifierThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        user = User.objects.filter(email__iexact=email).first()
        if user is None or not password:
            return Response({"detail": "Email or password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active:
            if user.check_password(password) and not is_verified(user):
                return Response({"detail": "Verify your email address before signing in. You can request another link below."}, status=status.HTTP_403_FORBIDDEN)
            return Response({"detail": "Email or password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, username=user.get_username(), password=password)
        if user is None:
            return Response({"detail": "Email or password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active or not is_verified(user):
            return Response({"detail": "Verify your email address before signing in. You can request another link below."}, status=status.HTTP_403_FORBIDDEN)
        auth_login(request, user)
        if request.data.get("remember_me") is True:
            request.session.set_expiry(60 * 60 * 24 * 30)
        else:
            request.session.set_expiry(0)
        return Response(auth_user_payload(user))


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        auth_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RecoveryIPThrottle, RecoveryIdentifierThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user and is_verified(user):
            try:
                send_password_reset_email(user)
            except Exception:
                # Keep the public response indistinguishable for unknown addresses.
                pass
        return Response({"detail": "If a verified account matches that address, reset instructions are on their way."})


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RecoveryIPThrottle, RecoveryIdentifierThrottle]

    def post(self, request):
        uidb64 = str(request.data.get("uid", ""))
        token = str(request.data.get("token", ""))
        password = request.data.get("password", "")
        password_confirm = request.data.get("password_confirm", "")
        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=user_id, is_active=True)
        except (User.DoesNotExist, TypeError, ValueError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, token):
            return Response({"detail": "This password reset link is invalid or expired. Request a new one."}, status=status.HTTP_400_BAD_REQUEST)
        if not password or password != password_confirm:
            return Response({"password_confirm": ["Enter and confirm the same new password."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password, user)
        except ValidationError as error:
            return Response({"password": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. Return to sign in with your new password."})


@method_decorator(csrf_protect, name="dispatch")
class UsernameRecoveryView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RecoveryIPThrottle, RecoveryIdentifierThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user and is_verified(user):
            send_mail(
                "Your MolarFlow username",
                "Your MolarFlow username is: {}\n\nIf you did not request this reminder, you can ignore this email.".format(user.get_username()),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        return Response({"detail": "If a verified account matches that address, username instructions have been sent."})
