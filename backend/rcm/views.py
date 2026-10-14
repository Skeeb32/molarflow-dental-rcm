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
    queryset = Claim.objects.select_related("practice").all()
    serializer_class = ClaimSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["status", "practice"]
    search_fields = ["reference", "payer", "procedure", "practice__name"]
    http_method_names = ["get", "patch", "head", "options"]

class PracticeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Practice.objects.annotate(claim_count=Count("claims")).all()
    serializer_class = PracticeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "region", "stage"]

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class OpportunityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Opportunity.objects.select_related("practice", "product").all()
    serializer_class = OpportunitySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["stage", "product"]

@api_view(["GET"])
def overview(request):
    claims = Claim.objects.all()
    today = timezone.localdate()
    overdue = claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).filter(submitted_at__lte=today - timedelta(days=30))
    expected = claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).aggregate(total=Sum("expected_amount"))["total"] or Decimal("0")
    pipeline = Opportunity.objects.aggregate(total=Sum("value"))["total"] or Decimal("0")
    status_counts = {row["status"]: row["total"] for row in claims.values("status").annotate(total=Count("id"))}
    return Response({
        "claim_count": claims.count(),
        "open_claims": claims.exclude(status__in=[Claim.Status.PAID, Claim.Status.DENIED]).count(),
        "denied_claims": status_counts.get(Claim.Status.DENIED, 0),
        "over_30_days": overdue.count(),
        "expected_reimbursement": expected,
        "practice_count": Practice.objects.count(),
        "pipeline_value": pipeline,
        "status_counts": status_counts,
    })
