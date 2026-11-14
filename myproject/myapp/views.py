from django import forms
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User
from django.shortcuts import redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_http_methods


def index(request):
    return render(request, 'index.html')


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True, label='Email address')

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('An account with this email already exists.')
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user


@require_http_methods(["GET", "POST"])
def signup(request):
    if request.user.is_authenticated:
        return redirect('home')
    form = SignUpForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        auth_login(request, user)
        return redirect('home')
    return render(request, 'Untitled-1.html', {'form': form})


@require_http_methods(["GET", "POST"])
def login(request):
    if request.user.is_authenticated:
        return redirect('home')
    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        auth_login(request, form.get_user())
        next_url = request.POST.get('next') or request.GET.get('next', '')
        if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
            return redirect(next_url)
        return redirect('home')
    return render(request, 'login.html', {'form': form, 'next': request.POST.get('next') or request.GET.get('next', '')})


@require_http_methods(["GET", "POST"])
def logout(request):
    if request.method == 'POST':
        auth_logout(request)
        return redirect('logout_done')
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'logout_confirm.html')


def logout_done(request):
    return render(request, 'logout.html')
