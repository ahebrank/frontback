FROM tiangolo/uwsgi-nginx:python3.8

ADD endpoint /app

RUN pip install -r /app/requirements.txt

# Docker image has a socket already, remove the one set in uwsgi.ini
RUN sed -i '/^socket/d' /app/uwsgi.ini