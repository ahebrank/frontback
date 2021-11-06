FROM tiangolo/uwsgi-nginx:python3.8

ADD dist /app

RUN pip install -r /app/requirements.txt