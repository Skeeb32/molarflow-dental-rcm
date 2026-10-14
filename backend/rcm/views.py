from decimal import Decimal
from datetime import timedelta
from django.db.models import Count, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Claim, Opportunity, Practice, Product
from .serializers import ClaimSerializer, OpportunitySerializer, PracticeSerializer, ProductSerializer

class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "practice"]
    search_fields = ["reference", "payer", "procedure", "practice__name"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Claim.objects.select_related("practice").filter(
            practice__memberships__user=self.request.user,
            practice__memberships__is_active=True,
        ).distinct()

class PracticeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PracticeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "region", "stage"]

    def get_queryset(self):
        return Practice.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
        ).annotate(claim_count=Count("claims")).distinct()

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class OpportunityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OpportunitySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["stage", "product"]

    def get_queryset(self):
        return Opportunity.objects.select_related("practice", "product").filter(
            practice__memberships__user=self.request.user,
            practice__memberships__is_active=True,
        ).distinct()

@api_view(["GET"])
def overview(request):
    practices = Practice.objects.filter(memberships__user=request.user, memberships__is_active=True).distinct()
    claims = Claim.objects.filter(practice__in=practices)
    today = timezone.localdate()
    overdue = claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).filter(submitted_at__lte=today - timedelta(days=30))
    expected = claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).aggregate(total=Sum("expected_amount"))["total"] or Decimal("0")
    pipeline = Opportunity.objects.filter(practice__in=practices).aggregate(total=Sum("value"))["total"] or Decimal("0")
    status_counts = {row["status"]: row["total"] for row in claims.values("status").annotate(total=Count("id"))}
    return Response({
        "claim_count": claims.count(),
        "open_claims": claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).count(),
        "denied_claims": status_counts.get(Claim.Status.DENIED, 0),
        "over_30_days": overdue.count(),
        "expected_reimbursement": expected,
        "practice_count": practices.count(),
        "pipeline_value": pipeline,
        "status_counts": status_counts,
    })
