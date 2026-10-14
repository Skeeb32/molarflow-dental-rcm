from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rcm.views import ClaimViewSet, OpportunityViewSet, PracticeViewSet, ProductViewSet, overview

router = DefaultRouter()
router.register("claims", ClaimViewSet, basename="claim")
router.register("practices", PracticeViewSet, basename="practice")
router.register("opportunities", OpportunityViewSet, basename="opportunity")
router.register("products", ProductViewSet, basename="product")
urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/auth/", include("rcm.auth_urls")),
    path("api/", include(router.urls)),
    path("api/overview/", overview, name="overview"),
]
