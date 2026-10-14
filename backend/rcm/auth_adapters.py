from django.contrib.auth import get_user_model
from django.utils import timezone
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from .models import Practice, PracticeMembership, StakeholderProfile


class ClosedAccountAdapter(DefaultAccountAdapter):
    """Keep local sign-up on the validated stakeholder API flow."""
    def is_open_for_signup(self, request):
        return False


class StakeholderSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form=form)
        clinic_name = (form.cleaned_data.get("clinic_name", "") if form else "").strip()
        if not clinic_name:
            raise ValueError("Clinic name is required to create a stakeholder account.")

        full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
        if not full_name:
            full_name = sociallogin.account.extra_data.get("name", "Dental stakeholder")
        verified = any(email.verified for email in sociallogin.email_addresses)
        now = timezone.now()
        user.is_active = verified
        user.save(update_fields=["is_active"])
        StakeholderProfile.objects.update_or_create(
            user=user,
            defaults={
                "full_name": full_name[:160],
                "normalized_email": user.email.strip().lower(),
                "email_verified_at": now if verified else None,
                "terms_accepted_at": now,
            },
        )
        practice = Practice.objects.create(name=clinic_name, region="Unassigned", stage=Practice.Stage.ONBOARDING)
        PracticeMembership.objects.create(
            user=user,
            practice=practice,
            role=PracticeMembership.Role.STAKEHOLDER,
            is_active=verified,
        )
        return user
