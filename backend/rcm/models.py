from django.conf import settings
from django.db import models

class Practice(models.Model):
    class Stage(models.TextChoices):
        LIVE = "live", "Live"
        ONBOARDING = "onboarding", "Onboarding"
        AT_RISK = "at_risk", "At risk"
    name = models.CharField(max_length=160)
    region = models.CharField(max_length=80)
    locations = models.PositiveSmallIntegerField(default=1)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.LIVE)
    mrr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    products = models.JSONField(default=list, blank=True)
    next_step = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.name

class StakeholderProfile(models.Model):
    """Non-privileged identity details for a dental-clinic stakeholder."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stakeholder_profile")
    full_name = models.CharField(max_length=160)
    normalized_email = models.EmailField(unique=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name or self.user.get_username()

class PracticeMembership(models.Model):
    """Connect a stakeholder to only the practice records they may access."""
    class Role(models.TextChoices):
        STAKEHOLDER = "stakeholder", "Stakeholder"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="practice_memberships")
    practice = models.ForeignKey(Practice, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=24, choices=Role.choices, default=Role.STAKEHOLDER)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "practice"], name="unique_stakeholder_practice")]

    def __str__(self):
        return "{} — {}".format(self.user.get_username(), self.practice.name)

class Claim(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        IN_REVIEW = "in_review", "In review"
        FOLLOW_UP = "follow_up", "Follow-up"
        DENIED = "denied", "Denied"
        PAID = "paid", "Paid"
    reference = models.CharField(max_length=24, unique=True)
    practice = models.ForeignKey(Practice, on_delete=models.CASCADE, related_name="claims")
    payer = models.CharField(max_length=120)
    procedure = models.CharField(max_length=120)
    submitted_at = models.DateField()
    billed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    expected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    patient_responsibility = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    denial_reason = models.CharField(max_length=180, blank=True)
    follow_up_note = models.CharField(max_length=240, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["submitted_at"]
    def __str__(self):
        return self.reference

class Product(models.Model):
    name = models.CharField(max_length=120, unique=True)
    category = models.CharField(max_length=80)
    description = models.CharField(max_length=240)
    monthly_price = models.DecimalField(max_digits=8, decimal_places=2)
    active_accounts = models.PositiveIntegerField(default=0)
    def __str__(self):
        return self.name

class Opportunity(models.Model):
    class Stage(models.TextChoices):
        QUALIFIED = "qualified", "Qualified"
        DISCOVERY = "discovery", "Discovery"
        PILOT = "pilot", "Pilot"
        PROPOSAL = "proposal", "Proposal"
    practice = models.ForeignKey(Practice, on_delete=models.CASCADE, related_name="opportunities")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="opportunities")
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.QUALIFIED)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    owner = models.CharField(max_length=100)
    due_date = models.DateField()
    note = models.CharField(max_length=220, blank=True)
    class Meta:
        ordering = ["due_date"]
