import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "local-only-insecure-key-do-not-deploy"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be configured when DJANGO_DEBUG is false.")

def csv_env(name, default):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]

ALLOWED_HOSTS = csv_env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
FRONTEND_ORIGINS = csv_env("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CSRF_TRUSTED_ORIGINS = csv_env("CSRF_TRUSTED_ORIGINS", ",".join(FRONTEND_ORIGINS))

INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework", "django_filters", "corsheaders",
    "allauth", "allauth.account", "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.apple",
    "allauth.socialaccount.providers.microsoft",
    "rcm.apps.RcmConfig",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware", "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"], "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request", "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]
SITE_ID = 1
LOGIN_REDIRECT_URL = "/"
ACCOUNT_ADAPTER = "rcm.auth_adapters.ClosedAccountAdapter"
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_CONFIRM_EMAIL_ON_GET = False
SOCIALACCOUNT_ADAPTER = "rcm.auth_adapters.StakeholderSocialAccountAdapter"
SOCIALACCOUNT_AUTO_SIGNUP = False
SOCIALACCOUNT_EMAIL_VERIFICATION = "mandatory"
SOCIALACCOUNT_EMAIL_AUTHENTICATION = False
SOCIALACCOUNT_LOGIN_ON_GET = False
SOCIALACCOUNT_FORMS = {"signup": "rcm.auth_forms.StakeholderSocialSignupForm"}

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID", "").strip()
MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET", "").strip()
MICROSOFT_TENANT = os.environ.get("MICROSOFT_TENANT", "common").strip()
APPLE_SERVICE_ID = os.environ.get("APPLE_SERVICE_ID", "").strip()
APPLE_KEY_ID = os.environ.get("APPLE_KEY_ID", "").strip()
APPLE_TEAM_ID = os.environ.get("APPLE_TEAM_ID", "").strip()
APPLE_PRIVATE_KEY = os.environ.get("APPLE_PRIVATE_KEY", "").replace("\\n", "\n")

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APPS": ([{"client_id": GOOGLE_CLIENT_ID, "secret": GOOGLE_CLIENT_SECRET, "key": ""}]
                 if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET else []),
        "SCOPE": ["profile", "email"],
        "OAUTH_PKCE_ENABLED": True,
        "VERIFIED_EMAIL": True,
    },
    "microsoft": {
        "APPS": ([{"client_id": MICROSOFT_CLIENT_ID, "secret": MICROSOFT_CLIENT_SECRET,
                    "settings": {"tenant": MICROSOFT_TENANT}}]
                 if MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET else []),
    },
    "apple": {
        "APPS": ([{"client_id": APPLE_SERVICE_ID, "secret": APPLE_KEY_ID,
                    "key": APPLE_TEAM_ID, "settings": {"certificate_key": APPLE_PRIVATE_KEY}}]
                 if APPLE_SERVICE_ID and APPLE_KEY_ID and APPLE_TEAM_ID and APPLE_PRIVATE_KEY else []),
    },
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Indiana/Indianapolis"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "false").lower() == "true"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "MolarFlow <no-reply@example.invalid>")
PASSWORD_RESET_TIMEOUT = 60 * 60
EMAIL_VERIFICATION_TIMEOUT = 60 * 60 * 24

CORS_ALLOWED_ORIGINS = FRONTEND_ORIGINS
CORS_ALLOW_CREDENTIALS = True
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend", "rest_framework.filters.SearchFilter"],
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "20/min", "auth_login_identity": "8/min",
        "auth_signup": "10/hour", "auth_signup_identity": "5/hour",
        "auth_recovery": "12/hour", "auth_recovery_identity": "4/hour",
    },
}

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = os.environ.get("CSRF_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = os.environ.get("COOKIE_SECURE", str(not DEBUG)).lower() == "true"
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", str(not DEBUG)).lower() == "true"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
