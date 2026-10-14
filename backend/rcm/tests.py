import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Claim, Practice, PracticeMembership, Product, StakeholderProfile

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class StakeholderAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def register(self, email="alex@example.com", username="alexdental"):
        return self.client.post("/api/auth/register/", {
            "full_name": "Alex Rivera",
            "clinic_name": "Rivera Family Dental",
            "email": email,
            "username": username,
            "password": "MolarFlow!Secure2026",
            "password_confirm": "MolarFlow!Secure2026",
            "terms_accepted": True,
        }, format="json")

    def test_registration_requires_email_verification_then_creates_session(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="alex@example.com")
        self.assertFalse(user.is_active)
        membership = PracticeMembership.objects.get(user=user)
        self.assertFalse(membership.is_active)
        self.assertEqual(user.stakeholder_profile.normalized_email, "alex@example.com")
        token = re.search(r"verify-email\?token=([^\s]+)", mail.outbox[0].body).group(1)

        verify = self.client.post("/api/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(verify.status_code, 200)
        user.refresh_from_db()
        membership.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(membership.is_active)
        self.assertIsNotNone(user.stakeholder_profile.email_verified_at)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

    def test_login_rejects_unverified_stakeholder(self):
        self.assertEqual(self.register().status_code, 201)
        response = self.client.post("/api/auth/login/", {
            "email": "alex@example.com",
            "password": "MolarFlow!Secure2026",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_duplicate_email_is_case_insensitive(self):
        self.assertEqual(self.register().status_code, 201)
        response = self.register(email="ALEX@example.com", username="alexsecond")
        self.assertEqual(response.status_code, 400)

    def test_claims_are_scoped_to_active_practice_memberships(self):
        user = User.objects.create_user(username="staff", email="staff@example.com", password="MolarFlow!Secure2026")
        StakeholderProfile.objects.create(user=user, full_name="Staff Member", normalized_email="staff@example.com", email_verified_at=timezone.now())
        own = Practice.objects.create(name="Own Dental", region="Midwest")
        other = Practice.objects.create(name="Other Dental", region="West")
        PracticeMembership.objects.create(user=user, practice=own, is_active=True)
        Claim.objects.create(reference="OWN-001", practice=own, payer="Payer A", procedure="D0120", submitted_at=timezone.localdate(), billed_amount=100, expected_amount=80)
        Claim.objects.create(reference="OTHER-001", practice=other, payer="Payer B", procedure="D0120", submitted_at=timezone.localdate(), billed_amount=120, expected_amount=90)
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/claims/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["reference"] for row in response.data], ["OWN-001"])

    def test_clinic_stakeholders_do_not_receive_global_product_adoption_totals(self):
        user = User.objects.create_user(username="clinic", email="clinic@example.com", password="MolarFlow!Secure2026")
        product = Product.objects.create(name="Claims Assist", category="RCM", description="Claims workflow", monthly_price=100, active_accounts=42)
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("active_accounts", response.data[0])
        user.is_staff = True
        self.client.force_authenticate(user=user)
        staff_response = self.client.get("/api/products/")
        self.assertEqual(staff_response.data[0]["active_accounts"], product.active_accounts)

    def test_recovery_response_does_not_disclose_unknown_email(self):
        response = self.client.post("/api/auth/password-reset/", {"email": "unknown@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("If a verified account matches", response.data["detail"])

    def test_password_reset_token_changes_password(self):
        user = User.objects.create_user(username="resetme", email="reset@example.com", password="MolarFlow!Secure2026")
        StakeholderProfile.objects.create(user=user, full_name="Reset User", normalized_email="reset@example.com", email_verified_at=timezone.now())
        response = self.client.post("/api/auth/password-reset/", {"email": user.email}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        match = re.search(r"reset-password/([^/]+)/([^\s]+)", mail.outbox[0].body)
        self.assertIsNotNone(match)
        confirm = self.client.post("/api/auth/password-reset/confirm/", {
            "uid": match.group(1),
            "token": match.group(2),
            "password": "NewMolarFlow!Pass2026",
            "password_confirm": "NewMolarFlow!Pass2026",
        }, format="json")
        self.assertEqual(confirm.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewMolarFlow!Pass2026"))

    def test_unsafe_auth_requests_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post("/api/auth/register/", {}, content_type="application/json")
        self.assertEqual(response.status_code, 403)
