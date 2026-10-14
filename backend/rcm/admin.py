from django.contrib import admin
from .models import Claim, Opportunity, Practice, Product

admin.site.register([Practice, Claim, Product, Opportunity])
