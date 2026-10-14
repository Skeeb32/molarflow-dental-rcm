from django.urls import path
from .auth_views import (
    CurrentUserView, LoginView, LogoutView, PasswordResetConfirmView,
    PasswordResetRequestView, ProviderConfigurationView, RegisterView,
    ResendVerificationView, UsernameRecoveryView, VerifyEmailView, csrf_cookie,
)

urlpatterns = [
    path("csrf/", csrf_cookie, name="auth-csrf"),
    path("providers/", ProviderConfigurationView.as_view(), name="auth-providers"),
    path("me/", CurrentUserView.as_view(), name="auth-current-user"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("username-recovery/", UsernameRecoveryView.as_view(), name="auth-username-recovery"),
]
