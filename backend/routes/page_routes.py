from flask import Blueprint, render_template

page_bp = Blueprint("pages", __name__)

@page_bp.route("/")
def home():
    return render_template("shared/home.html")

@page_bp.route("/page1")
def page1():
    return render_template("pages/page1-placeholder/page1.html")

@page_bp.route("/page2")
def page2():
    return render_template("pages/page2-placeholder/page2.html")

# To add a page later: copy the pattern above, point it at a new
# frontend/pages/<name>/<name>.html, and add a nav link in base.html.