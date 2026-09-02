from flask import Flask
from routes.page_routes import page_bp

def create_app():
    app = Flask(
        __name__,
        template_folder="../frontend",   # so render_template() looks in frontend/
        static_folder="../frontend",     # so url_for('static', ...) serves css/js from frontend/
        static_url_path="/static",
    )
    app.register_blueprint(page_bp)
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)