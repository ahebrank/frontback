#!/usr/bin/env python3
import os
from issue_proxy import create_app

config = os.environ.get('FRONTBACK_CONFIG')
if config is None:
    config = '/etc/default/frontback';

application = create_app(config, debug=True)

if __name__ == "__main__":
    application.run()
