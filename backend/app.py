from flask import Flask, render_template

def create_app():
    app = Flask(__name__, template_folder='../frontend', static_folder='../frontend')

    @app.route('/')
    def home():
        return render_template('pages/home/index.html')

    @app.route('/page1')
    def page1():
        return render_template('pages/page1-placeholder/page1.html')

    @app.route('/page2')
    def page2():
        return render_template('pages/page2-placeholder/page2.html')

    return app
