from django.dispatch import receiver
from django.utils import timezone
from allauth.account.signals import email_confirmed
from .models import PracticeMembership, StakeholderProfile


@receiver(email_confirmed)
def activate_verified_stakeholder(sender, request, email_address, **kwargs):
    user = email_address.user
    profile, _ = StakeholderProfile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.get_full_name() or user.get_username(),
            "normalized_email": user.email.strip().lower(),
        },
    )
    profile.email_verified_at = timezone.now()
    profile.save(update_fields=["email_verified_at"])
    user.is_active = True
    user.save(update_fields=["is_active"])
    PracticeMembership.objects.filter(user=user).update(is_active=True)
