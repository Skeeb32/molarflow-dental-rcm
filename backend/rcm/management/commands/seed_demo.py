from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from rcm.models import Claim, Opportunity, Practice, Product

class Command(BaseCommand):
    help = "Load fictional MolarFlow demo records."

    def handle(self, *args, **options):
        Opportunity.objects.all().delete()
        Claim.objects.all().delete()
        Practice.objects.all().delete()
        Product.objects.all().delete()
        products = [
            Product.objects.create(name="Claims Assist", category="Revenue cycle", description="Claim scrubbing and submission visibility", monthly_price=Decimal("349.00"), active_accounts=18),
            Product.objects.create(name="Eligibility Check", category="Patient access", description="Coverage checks before the visit", monthly_price=Decimal("189.00"), active_accounts=24),
            Product.objects.create(name="Patient Pay", category="Collections", description="Digital statements and flexible payment plans", monthly_price=Decimal("129.00"), active_accounts=11),
        ]
        practices = [
            Practice.objects.create(name="Northstar Dental Group", region="Midwest", locations=8, stage="live", mrr=Decimal("4280.00"), products=["Claims Assist", "Eligibility Check"], next_step="Review aging trend with billing lead"),
            Practice.objects.create(name="Juniper Family Dentistry", region="Great Lakes", locations=3, stage="onboarding", mrr=Decimal("980.00"), products=["Eligibility Check"], next_step="Complete payer enrollment checklist"),
            Practice.objects.create(name="Brightline Smiles", region="Southeast", locations=5, stage="at_risk", mrr=Decimal("2140.00"), products=["Claims Assist", "Patient Pay"], next_step="Schedule collections workflow review"),
            Practice.objects.create(name="Cedar Grove Dental Partners", region="Midwest", locations=2, stage="live", mrr=Decimal("1675.00"), products=["Claims Assist"], next_step="Introduce patient payment plans"),
            Practice.objects.create(name="Harborview Dentistry", region="Northeast", locations=4, stage="live", mrr=Decimal("3250.00"), products=["Eligibility Check", "Patient Pay"], next_step="Share quarterly performance recap"),
        ]
        today = timezone.localdate()
        rows = [
            (0, "Delta Dental", "D2740 · Crown", 34, "follow_up", 1240, 890, 180, "Narrative requested", "Attach clinical narrative and resubmit"),
            (0, "Aetna Dental", "D1110 · Prophylaxis", 8, "in_review", 186, 132, 54, "", "Payer review in progress"),
            (1, "Cigna Dental", "D2392 · Resin, 2 surfaces", 47, "denied", 328, 236, 92, "Frequency limitation", "Confirm prior service history"),
            (2, "MetLife Dental", "D4341 · Periodontal scaling", 22, "follow_up", 890, 622, 110, "", "Check attachment receipt with payer"),
            (3, "Guardian Dental", "D0120 · Periodic exam", 12, "submitted", 148, 104, 44, "", "Awaiting payer acknowledgement"),
            (4, "Delta Dental", "D2950 · Core buildup", 56, "denied", 415, 292, 80, "Documentation incomplete", "Request chart note from practice"),
            (0, "United Concordia", "D2740 · Crown", 18, "in_review", 1320, 940, 190, "", "Payer review in progress"),
            (1, "Aetna Dental", "D0140 · Limited exam", 5, "paid", 112, 79, 33, "", "Payment posted"),
            (2, "Cigna Dental", "D4341 · Periodontal scaling", 39, "follow_up", 760, 535, 120, "X-ray attachment missing", "Upload current radiographs"),
            (3, "MetLife Dental", "D2391 · Resin, 1 surface", 15, "submitted", 205, 144, 61, "", "Awaiting payer acknowledgement"),
        ]
        claims = []
        for index, row in enumerate(rows, start=1):
            practice_idx, payer, procedure, age, status, billed, expected, responsibility, denial, note = row
            claims.append(Claim(reference=f"MF-{today.year}-{index:04d}", practice=practices[practice_idx], payer=payer, procedure=procedure, submitted_at=today - timedelta(days=age), billed_amount=Decimal(billed), expected_amount=Decimal(expected), patient_responsibility=Decimal(responsibility), status=status, denial_reason=denial, follow_up_note=note))
        Claim.objects.bulk_create(claims)
        Opportunity.objects.bulk_create([
            Opportunity(practice=practices[1], product=products[0], stage="pilot", value=Decimal("1047.00"), owner="Morgan Lee", due_date=today + timedelta(days=3), note="Pilot starts after payer enrollment"),
            Opportunity(practice=practices[2], product=products[1], stage="discovery", value=Decimal("945.00"), owner="Avery Chen", due_date=today + timedelta(days=6), note="Map front-desk verification steps"),
            Opportunity(practice=practices[3], product=products[2], stage="qualified", value=Decimal("387.00"), owner="Morgan Lee", due_date=today + timedelta(days=9), note="Requested payment plan walkthrough"),
            Opportunity(practice=practices[4], product=products[0], stage="proposal", value=Decimal("1396.00"), owner="Riley James", due_date=today + timedelta(days=12), note="Proposal includes four locations"),
        ])
        self.stdout.write(self.style.SUCCESS("Loaded fictional MolarFlow demo records."))
