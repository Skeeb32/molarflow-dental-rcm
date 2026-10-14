from rest_framework import serializers
from .models import Claim, Opportunity, Practice, Product

class ClaimSerializer(serializers.ModelSerializer):
    practice_name = serializers.CharField(source="practice.name", read_only=True)
    age_days = serializers.SerializerMethodField()
    class Meta:
        model = Claim
        fields = ["id", "reference", "practice", "practice_name", "payer", "procedure", "submitted_at", "billed_amount", "expected_amount", "patient_responsibility", "status", "denial_reason", "follow_up_note", "age_days", "updated_at"]
        read_only_fields = ["id", "practice_name", "age_days", "updated_at"]
    def get_age_days(self, claim):
        from django.utils import timezone
        return max((timezone.localdate() - claim.submitted_at).days, 0)

class PracticeSerializer(serializers.ModelSerializer):
    claim_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Practice
        fields = ["id", "name", "region", "locations", "stage", "mrr", "products", "next_step", "claim_count"]

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "category", "description", "monthly_price", "active_accounts"]

class OpportunitySerializer(serializers.ModelSerializer):
    practice_name = serializers.CharField(source="practice.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    class Meta:
        model = Opportunity
        fields = ["id", "practice", "practice_name", "product", "product_name", "stage", "value", "owner", "due_date", "note"]
