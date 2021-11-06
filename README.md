# Frontback

Pluggable front-end issue submission for VCS and issue boards.  A script allows end users to take screenshots of a problem, add a comment and automatic browser info, and submit it all as an issue or card.

This leans heavily on:
- [ivoviz/feedback](https://github.com/ivoviz/feedback)
- [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas)

## Currently supporting

- Gitlab
- Trello

## Quickstart

### Add the plugin to a page:

```html
<script>
    window.frontback = {
        repo: 'https://gitlab.com/newcity/test',
        postUrl: 'http://' + host + ':9000',
        options: {},
        extra: {}
    };
    var script = document.createElement('script');
    script.src = frontback.postUrl + '/assets/js/frontback.js';
    document.body.appendChild(script);
</script>
```

The `repo` and 'postUrl` keys define the homepage of the repository and the endpoint of the proxy.

`options` parameters include:

- `options.hideButton`: if `true`, hide the submission button while still running the script (might be helpful for preventing issue submission from local dev instances)
- `options.hideAssigneeOptions`: if `true`, hide the assignee select (the default assignee from the endpoint repo config will be used if provided)
- `options.overrideDefaultAssignee`: override the default assignee per frontend instance by specifying a username
- `options.hideReporterOptions`: if `true`, hide the user select (it will remain a text box)

The `extra` parameter is optional but may be used to pass additional metadata (for instance, CMS contextual variables like the current username). These should be specified with a dictionary:

```js
extra: {
    "User": my_cms_settings.username,
    "Site section": my_cms_settings.section
}
```

#### CMS integration

There are currently a few experimental modules/plugins to provide the snippet integration with stored backend configuration.

- WP: https://github.com/ahebrank/wp-frontback
- Drupal 8: https://github.com/ahebrank/drupal-frontback (`composer require ahebrank/frontback`)

### Configure the service targets at the endpoint

In a place accessible to the endpoint proxy, add configuration in a json array. Services may be combined in a single file and APIs are selected based on the homepage URL.

#### Gitlab

Find your Gitlab private token from https://gitlab.com/profile/personal_access_tokens (or similar for your hosted instance)

Use the project homepage as a key and optionally set the assigned user (Gitlab ID) and default tag(s), which assigns labels and is useful for landing the issue on a particular board list.

```json
{
    "https://gitlab.com/newcity/test": {
        "private_token": "GITLAB-PRIVATE-TOKEN",
        "assignee_id": "ahebrank",
        "tags": "Incoming"
    }
}
```

#### Trello

Generate a Trello application key at https://trello.com/app-key and use that to generate an auth token from https://trello.com/1/connect?key=[key]&name=Frontback&response_type=token&scope=read,write

Then use the trello board URL as the key and optionally set an assignee (Trello username) and tags (as an array, should match names of existing labels on your board).

```json
{
    "https://trello.com/b/S1QWR14x/api-test": {
        "app_key": "APPLICATION_KEY",
        "private_token": "PRIVATE_AUTH_TOKEN",
        "assignee_id": "ahebrank",
        "tags": [
          "Informative Label",
          "Another label"
        ]
    }
}
```

#### Other helpful configuration

- *dev_url_replace*: **DEPRECATED: see `dev_replace` below**: perform string find/replace to append a development URL (or more than one) to the issue, making it easy to get to the relevant page on your development environment in one click. Example:

  ```json
  "dev_url_replace": "staging.example.com|localhost"`
  ```

  For additional (e.g., staging) URLs, append more pipes.

- *dev_replace*: append a development URL (or more than one) to the issue, making it easy to get to the relevant page on your development environment in one click.

  For example, replace any incoming URL containing "newcity.gitlab.io" with a localhost dev endpoint and remove an initial URL path subdirectory:

  ```json
  "dev_replace": {
    "host": "http://localhost:3000",
    "path": "/frontback/|/"
  }
  ```

  Multiple dev URLs may be specified in array format. Specifying the protocol (HTTP scheme) is optional and only needed when it differs between the original and replacement URLs. The `match` parameter is optional and can be used to control replacement behavior by filtering the origin URL if, for instance, multiple applications are deployed out of the same repository.

  ```json
  "dev_replace": [
    {
      "match": "newcity.gitlab.io",
      "host": "http://localhost:3000",
      "path": "/frontback/|/"
    },
    {
      "match": "!newcity.gitlab_io",
      "host": "http://localhost:9000"
    },
  ]
  ```

- *link_dompath*: the issue reporting widget attempts to pass the path through to the DOM to any selected element in the screenshot. Setting this parameter to `true` will add a query parameter to the reporting URL so that visiting the page will re-highlight the originally highlighted element.

- *conditional_path_tags*: assign tags/labels to a report conditionally based on the submission URL. For instance, the repo config below will assign different tags for different sites:

```json
"conditional_path_tags": {
  "OREC": "tamuorecstg.wpengine.com",
  "Privacy": "tamuprivacystg.wpengine.com",
  "Rules": "tamurulesstg.wpengine.com",
  "UYP": "tamuuypstaging.wpengine.com"
}
```

### Start it up

The python wsgi web stack configuration has a lot of pieces. The following skips over setting up a virtual environment and assumes the flask app is installed in `/usr/local/frontback/endpoint`.

#### Base requirements

1. Python 3.x is required
2. `pip3 install -r /usr/local/frontback/endpoint/requirements.txt`

#### Nginx uwsgi proxy

1. Make sure `uwsgi` is installed (e.g., `pip3 install uwsgi`)
2. Copy the upstart config to `/etc/init` (`cp /usr/local/frontback/endpoint/service-config/frontback.conf.upstart /etc/init/frontback.config`) OR copy the systemd service (`cp /usr/local/frontback/endpoint/service-config/frontback.service.systemd /lib/systemd/system/frontback.service`)
3. Start it up (e.g., `service frontback start` or `systemctl start frontback`)
4. (optionally) Make it persistent (e.g., `initctl reload-configuration` or `systemctl enable frontback`)
5. Make sure the uwsgi parameters are availble to nginx (`cat /etc/nginx/uwsgi_params`)
6. Add to a `server` block in nginx configuration:

```
location ~ /frontback(/.*) {
    uwsgi_pass unix:/tmp/uwsgi.sock;
    include /etc/nginx/uwsgi_params;
    # strip the subdirectory
    uwsgi_param PATH_INFO "$1";
}
```

7. restart nginx

(This example includes config to strip off the subdirectory, since the Flask application assumes requests at the webroot.)

See e.g., https://www.digitalocean.com/community/tutorials/how-to-deploy-python-wsgi-applications-using-uwsgi-web-server-with-nginx for more detail about setting up and proxying uwsgi applications.

#### Older way: Apache2 with mod_wsgi

1. Install mod_wsgi (e.g., `apt-get install libapache2-mod-wsgi`)
2. Within an apache2 virtual host, add config like:

```
WSGIDaemonProcess frontback user=www-data group=www-data threads=5 home=
/usr/local/frontback/endpoint
WSGIScriptAlias / /usr/local/frontback/endpoint/main.py

<Directory /usr/local/frontback/endpoint>
  	WSGIProcessGroup frontback
  	WSGIApplicationGroup %{GLOBAL}
    Require all granted
</Directory>
```


## Building and testing

### Prerequisites

- python3 and pip3
- nodejs and yarn

### Install

Use `make install` to install dependencies with yarn and pip. Create a `repos.json` file in the endpoint directory.

###

Use `make dev`, which does the following:

- `gulp` builds styles and scripts and puts up a test page at `http://localhost:3000`.  See `test/index.html` to modify the plugin configuration.

- run the endpoint:

    ```bash
    cd endpoint
    python3 issue_proxy.py -c repos.json -p 9000 --debug
    ```
