# Django Framework Overview

## What is Django?
**Django** is a high-level, open-source Python web framework that encourages rapid development and clean, pragmatic design. It follows the "batteries-included" philosophy, providing built-in tools for authentication, URL routing, database management (ORM), and an automatic admin interface.

---

## MVT Architecture
Django follows the **MVT (Model-View-Template)** architectural pattern:

* **Model:** Manages the data layer and database schema (defines tables and fields using Python classes via Django's ORM).
* **View:** Handles the business logic, processes incoming HTTP requests, interacts with the Model, and returns an HTTP response.
* **Template:** Manages the presentation layer (HTML files enhanced with Django Template Language to dynamically display data).

---

## Django Request-Response Workflow

1. **Browser:** User requests `/jobs/` through HTTP.
2. **Project `urls.py`:** Receives the URL and routes it using `include()`.
3. **Application `urls.py`:** Matches the `/jobs/` path to a specific view function.
4. **`views.py`:** Executes the corresponding view function.
5. **`models.py` $\rightarrow$ SQLite:** ORM queries the database and retrieves records.
6. **`templates`:** Django renders HTML using the retrieved data.
7. **Browser:** Receives the HTTP response, displays the rendered HTML, and loads associated CSS/static assets.

---

## Project Setup & Step-by-Step Guide

### 1. Initialize Project and App
Open your terminal (`cmd`) and run the following commands:

```bash
# Check django-admin commands
django-admin

# Create a new Django project
django-admin startproject projectname
cd projectname

# Create a new application inside the project
python manage.py startapp appname
```

---

### 2. Configure App URLs
Navigate into your app folder (`cd appname`), create a `urls.py` file, and add your routes:

```python
# appname/urls.py
from django.contrib import admin
from django.urls import path
from myapp import views

urlpatterns = [
    path('', views.index, name='index'),
    path('about', views.about, name='about'),
    # Add more paths here...
]
```

---

### 3. Configure Project URLs & Admin Branding
Navigate back to the project folder (`cd ..` then `cd projectname`), open `urls.py`, and include your app's URLs:

```python
# projectname/urls.py
from django.contrib import admin
from django.urls import path, include

# Customize Admin Portal text
admin.site.site_header = "MyApp Admin"
admin.site.site_title = "MyApp Admin Portal"
admin.site.index_title = "Welcome to MyApp Portal"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('myapp.urls')),  # Include the URLs from myapp
]
```

---

### 4. Create Views & Run Server
Navigate to your app folder (`cd ..` then `cd myapp`) and open `views.py`:

```python
# myapp/views.py
from django.shortcuts import render, HttpResponse

def index(request):
    context = {'variable': 'Hello, World!'}
    # messages.success(request, 'This is a test message.')
    return render(request, 'index.html', context)

# Alternative simple HttpResponse example:
# def index(request):
#     return HttpResponse('Hello, World! Welcome to the Home Page.')
```

Start the development server from the root directory (where `manage.py` is located):

```bash
python manage.py runserver
```

---

### 5. Set Up Templates and Static Directories
From the root directory (`cd ..`), create folders for your HTML templates and static files (CSS, JS, images):

```bash
mkdir templates
mkdir static
```

Inside `templates/`, create `index.html`. If inheriting from a `base.html` layout, use Django template tags:

```html
<!-- templates/index.html -->
{% extends 'base.html' %}

{% block content %}
    <!-- Write your page-specific HTML code here -->
{% endblock %}
```

---

### 6. Update `settings.py`
Open `projectname/settings.py` and register your app, static directory, and template directory:

```python
# projectname/settings.py
import os

INSTALLED_APPS = [
    'myapp.apps.MyappConfig',
    # ... default django apps
]

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        # ... other settings
    }
]
```

---

### 7. Create Models & Register in Admin
Navigate to your app directory (`cd appname`) and define your database schema in `models.py`:

```python
# appname/models.py
from django.db import models

class Contact(models.Model):
    name = models.CharField(max_length=122)
    email = models.CharField(max_length=122)
    desc = models.TextField()
    date = models.DateField()

    def __str__(self):
        return self.name
```

Open `admin.py` in the same folder and register the model so it appears in the Django admin panel:

```python
# appname/admin.py
from django.contrib import admin
from .models import Contact

# Register your models here
admin.site.register(Contact)
```

---

### 8. Database Migrations & Superuser Setup
Run these commands in the root directory to apply database changes and create an admin login:

```bash
# Detect model changes and create migration files
python manage.py makemigrations

# Apply migrations to the database (including Default Authentication System)
python manage.py migrate

# Create an admin user to access /admin
python manage.py createsuperuser
```
