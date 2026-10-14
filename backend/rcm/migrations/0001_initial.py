from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Practice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("region", models.CharField(max_length=80)),
                ("locations", models.PositiveSmallIntegerField(default=1)),
                ("stage", models.CharField(choices=[("live", "Live"), ("onboarding", "Onboarding"), ("at_risk", "At risk")], default="live", max_length=20)),
                ("mrr", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("products", models.JSONField(blank=True, default=list)),
                ("next_step", models.CharField(blank=True, max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
                ("category", models.CharField(max_length=80)),
                ("description", models.CharField(max_length=240)),
                ("monthly_price", models.DecimalField(decimal_places=2, max_digits=8)),
                ("active_accounts", models.PositiveIntegerField(default=0)),
            ],
        ),
        migrations.CreateModel(
            name="Claim",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=24, unique=True)),
                ("payer", models.CharField(max_length=120)),
                ("procedure", models.CharField(max_length=120)),
                ("submitted_at", models.DateField()),
                ("billed_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("expected_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("patient_responsibility", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("status", models.CharField(choices=[("submitted", "Submitted"), ("in_review", "In review"), ("follow_up", "Follow-up"), ("denied", "Denied"), ("paid", "Paid")], default="submitted", max_length=20)),
                ("denial_reason", models.CharField(blank=True, max_length=180)),
                ("follow_up_note", models.CharField(blank=True, max_length=240)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("practice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="claims", to="rcm.practice")),
            ],
            options={"ordering": ["submitted_at"]},
        ),
        migrations.CreateModel(
            name="Opportunity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("stage", models.CharField(choices=[("qualified", "Qualified"), ("discovery", "Discovery"), ("pilot", "Pilot"), ("proposal", "Proposal")], default="qualified", max_length=20)),
                ("value", models.DecimalField(decimal_places=2, max_digits=10)),
                ("owner", models.CharField(max_length=100)),
                ("due_date", models.DateField()),
                ("note", models.CharField(blank=True, max_length=220)),
                ("practice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="opportunities", to="rcm.practice")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="opportunities", to="rcm.product")),
            ],
            options={"ordering": ["due_date"]},
        ),
    ]
