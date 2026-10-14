from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("rcm", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="StakeholderProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=160)),
                ("normalized_email", models.EmailField(max_length=254, unique=True)),
                ("email_verified_at", models.DateTimeField(blank=True, null=True)),
                ("terms_accepted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="stakeholder_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="PracticeMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("stakeholder", "Stakeholder")], default="stakeholder", max_length=24)),
                ("is_active", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("practice", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="rcm.practice")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="practice_memberships", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="practicemembership",
            constraint=models.UniqueConstraint(fields=("user", "practice"), name="unique_stakeholder_practice"),
        ),
    ]
