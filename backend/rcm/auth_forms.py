from django import forms
from allauth.socialaccount.forms import SignupForm


class StakeholderSocialSignupForm(SignupForm):
    clinic_name = forms.CharField(max_length=160, label="Dental clinic or organization")
    terms_accepted = forms.BooleanField(label="I agree to the Terms of Service and Privacy Policy")

    def save(self, request):
        # The adapter creates a least-privilege clinic membership from these
        # validated fields after allauth has verified the provider response.
        return super().save(request)
