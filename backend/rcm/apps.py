from django.apps import AppConfig

class RcmConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rcm"

    def ready(self):
        from . import signals  # noqa: F401
