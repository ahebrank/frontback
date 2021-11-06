FROM tiangolo/uwsgi-nginx:python3.8

ADD endpoint /app

RUN pip install -r /app/requirements.txt