from django.contrib import admin
from .models import Claim, Opportunity, Practice, PracticeMembership, Product, StakeholderProfile

admin.site.register([Practice, PracticeMembership, StakeholderProfile, Claim, Product, Opportunity])
