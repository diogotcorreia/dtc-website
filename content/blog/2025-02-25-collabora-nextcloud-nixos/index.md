+++
title = "Installing Collabora Online on Nextcloud with NixOS"

[taxonomies]
tags = ["nextcloud", "nixos", "sysadmin"]
+++

In this post we will take a look at how to setup [Collabora Online] on
a Nextcloud instance using NixOS, resulting in a compelling self-hosted
alternative to Google Docs/Sheets/Slides/Drawings.
<!-- more -->

With Collabora Online (which is based on LibreOffice), you can add support for documents,
spreadsheets, slideshows and drawings to Nextcloud through the
[Nextcloud Office app][nc-richdocuments], allowing those files to be opened directly
in the browser.
Furthermore, multiple users can edit the files simultaneously, just like you might be
used to from Google's offerings.

Personally, while I don't use an office suite that often (I prefer the comfort of neovim),
when I have to I usually use Google's, so this has been something I have wanted to de-Google
for a while.
Recently, and as part of NixOS 24.11, the [highly][cool-request-1] [requested][cool-request-2]
package and module for Collabora Online [has been merged][merged-cool] into nixpkgs, which makes
it the perfect opportunity to finally install this in my Nextcloud instance.

{{ img(caption="Two users on a Collabora Online document, one authenticated and the other a guest, showcasing multi-user concurrency capabilities", path="./multiplayer-collabora.png") }}

## How It Works

It was not immediately clear to me how Collabora and Nextcloud would integrate with each
other, especially when taking security into account.
There didn't seem to exist any API keys or anything similar, and all tutorials I could find seemed
to encourage exposing Collabora to the internet (or over a VPN, if you are using that for Nextcloud
as well).
This left me with a few questions: who stores the documents? Can someone use my Collabora instance
without being authenticated with Nextcloud? How does authentication even work (remember, no API keys are
shared between Nextcloud and Collabora)?

After a lot of research and some source code reading, I figured out (mostly) how it works.
Nextcloud and Collabora communicate using the [WOPI protocol][wopi], first introduced by
Microsoft.
In this scenario, Nextcloud behaves as a WOPI Host, while Collabora behaves as a WOPI Client.
This was first unintuitive to me, but it now makes sense: after all, Nextcloud is storing
the files, while Collabora is just accessing them.
When you open a file in Nextcloud, it gives you a token and tells you to go talk to Collabora.
Your browser will then start the Collabora web application and give it the file URL and that
token, which Collabora uses to fetch the file and display it on your browser.
There are no API keys whatsoever because all authentication happens client-side. Neat!

This behaviour is summarized in a [sequence diagram] in a post on the Nextcloud Forums,
which could be worth a look if you are still confused.

Regarding security considerations, Nextcloud and Collabora allow you to restrict
which IP addresses and domains they talk to, respectively.
This means it is possible to limit Nextcloud to only accept WOPI Clients with a given IP
address, and Collabora to only open documents from a given WOPI Host, which resolves
my security concerns.

Finally, when it comes to storage, everything happens on Nextcloud.
Nothing is stored on Collabora, so we don't need to worry about backups or even persistence
(in case you are using [ephemeral root storage][erase-your-darlings] like me).

## Deploy Collabora with NixOS

Given that a module now exists, it is pretty straightforward to deploy Collabora on
a NixOS system:

```nix
{...}: {
  services.collabora-online = {
    enable = true;
    port = 9980; # default
    settings = {
      # Rely on reverse proxy for SSL
      ssl = {
        enable = false;
        termination = true;
      };

      # Listen on loopback interface only, and accept requests from ::1
      net = {
        listen = "loopback";
        post_allow.host = ["::1"];
      };

      # Restrict loading documents from WOPI Host nextcloud.example.com
      storage.wopi = {
        "@allow" = true;
        host = ["nextcloud.example.com"];
      };

      # Set FQDN of server
      server_name = "collabora.example.com";
    };
  };
}
```

We set some settings that can depend on your setup, but here's the reasoning behind
them:

- since we'll be using a reverse proxy in front of Collabora, we don't need it to
  handle SSL connections, so we disable it with `ssl.enable = false`, but tell it
  other users/apps are still supposed to use SSL when connecting to it with `ssl.termination = true`;
- likewise, since connections will only be happening through the reverse proxy and
  locally (Nextcloud), Collabora only needs to listen on localhost;
- as previously mentioned, we set `storage.wopi.host` to restrict Collabora to only
  open documents from our Nextcloud instance;
- we set `server_name` so that Collabora always uses it in the URLs it responds with,
  which would otherwise be derived from the `Host` HTTP header.
  This is needed because we will make Nextcloud use localhost to talk to Collabora,
  which then forwards some URLs to the user.
  Without setting this option, those URLs would be `https://[::1]:9980/...`, which the
  user wouldn't be able to access.

For all other settings, we can use the defaults (the NixOS module automatically adds them),
which includes an option to keep the admin console disabled.

Then, we must setup a reverse proxy, to forward all requests to port 9980, including WebSockets.
This will depend on your setup, but most people are using NGINX, so here is an example config:

```nix
{config, ...}: {
  services.nginx = {
    enable = true;
    # I recommend these, but it's up to you
    recommendedProxySettings = true;
    recommendedTlsSettings = true;

    virtualHosts."collabora.example.com" =  {
      enableACME = true;
      forceSSL = true;
      locations."/" = {
        proxyPass = "http://[::1]:${toString config.services.collabora-online.port}";
        proxyWebsockets = true; # collabora uses websockets
      };
    };
  };
}
```

After rebuilding your configuration, you can visit `https://collabora.example.com/hosting/discovery`
(which should show an XML document) to ensure Collabora is working fine.
If so, congratulations, you are ready to move into the next step!

## Integrating with Nextcloud

Integrating this with Nextcloud is also pretty straightforward, but it's a bit more
cumbersome to set the configuration options declaratively.

Firstly, we need to install the [Nextcloud Office][nc-richdocuments] app, also
known as `richdocuments`.
If you can't be bothered to do this declaratively, it is as simple as going into Nextcloud,
opening the Apps page, going to the "Office & text" category and clicking the "Download and enable"
button.
But if you are here, you probably want to use Nix to do this, and fortunately that's not
a lot of work since it is packaged:

```nix
{...}: {
  services.nextcloud = {
    # Hopefully you have configured Nextcloud already :)
    # ...

    # If this is your first time adding an app to `extraApps`, you might want to
    # keep the stateful app store enabled.
    appstoreEnable = true;

    extraAppsEnable = true;
    extraApps = with config.services.nextcloud.package.packages.apps; {
      inherit
        # ... other apps
        richdocuments # Collabora Online for Nextcloud - https://apps.nextcloud.com/apps/richdocuments
        ;
    };
  };
}
```

This is all that takes to install the app on Nextcloud, but now we need to configure it.
Again, this is entirely possible to do through the UI (under Administration settings -> Office),
but I prefer to do this declaratively.

The underlying options seem to be poorly documented (or at least I could not find them),
so I made a trip to the [app's source code][richdocuments-config-php] to find them.
Here are the relevant ones:

- `wopi_url`: URL that Nextcloud will use to connect to Collabora internally;
- `public_wopi_url`: URL that the browser will use to connect to Collabora (must be publicly-accessible);
- `wopi_allowlist`: comma-separated list of IP addresses of WOPI clients to accept connections from.

It could be relevant to note that `public_wopi_url` cannot be set through the UI
(at least that I could find), so you just have to use the public URL for `wopi_url`,
if you are going that route.

Unfortunately, these options are stored in the database, so we must set them up with `occ`.
For that reason, I've written a systemd unit that runs when Nextcloud and Collabora start
and sets these options:

```nix
{config, ...}: {
  systemd.services.nextcloud-config-collabora = let
    inherit (config.services.nextcloud) occ;

    wopi_url = "http://[::1]:${toString config.services.collabora-online.port}";
    public_wopi_url = "https://collabora.example.com";
    wopi_allowlist = lib.concatStringsSep "," [
      "127.0.0.1"
      "::1"
    ];
  in {
    wantedBy = ["multi-user.target"];
    after = ["nextcloud-setup.service" "coolwsd.service"];
    requires = ["coolwsd.service"];
    script = ''
      ${occ}/bin/nextcloud-occ config:app:set richdocuments wopi_url --value ${lib.escapeShellArg wopi_url}
      ${occ}/bin/nextcloud-occ config:app:set richdocuments public_wopi_url --value ${lib.escapeShellArg public_wopi_url}
      ${occ}/bin/nextcloud-occ config:app:set richdocuments wopi_allowlist --value ${lib.escapeShellArg wopi_allowlist}
      ${occ}/bin/nextcloud-occ richdocuments:setup
    '';
    serviceConfig = {
      Type = "oneshot";
      User = "nextcloud";
    };
  };
}
```

Another thing to note is that if you are deploying this on a machine with a public IP
address (e.g., a VPS), you can use `127.0.0.1` and `::1` for `wopi_allowlist`,
but that is not the case if you are behind NAT (which is my case).
I could not find a way have Collabora connect through localhost to Nextcloud because
Nextcloud is not listening on any port but instead on a Unix socket that is then behind
a reverse proxy, so even tough the `wopi_callback_url` option exists, I could not use it.
Additionally, I did not want to hardcode my public IP address in the config
because it could change in the future (it's not a static IP address).

For that reason, the easiest solution seems to be to edit `/etc/hosts` to force
Collabora to resolve `nextcloud.diogotc.com` to localhost:
```nix
{...}: {
  networking.hosts = {
    "127.0.0.1" = ["nextcloud.example.com" "collabora.example.com"];
    "::1" = ["nextcloud.example.com" "collabora.example.com"];
  };
}
```

With this, we can now keep the aforementioned IP addresses for `wopi_allowlist`.

After this is done and another rebuild, you should see a green checkmark in the
Administration settings -> Office page:

{{ img(caption="Nextcloud settings showing that Collabora Online is reachable from Nextcloud", path="./richdocuments-success.png") }}

If needed, you can also take a look at the [commit][dotfiles-commit] where I deployed
this on my server.

## Problems

Almost everything I tested seems to be working perfectly, which is awesome!
But unfortunately, a major feature seems to be broken at the moment: PDF export.
This seems to be a packaging issue and other people in the nixpkgs community
[have pointed out that it is for them broken as well][pdf-broken].

If you already have LibreOffice installed locally, it's not a critical issue since you
can just download the file and export it there, but it's rather annoying and
will hopefully be fixed soon.

## Conclusion

In this post we've taken a look into how to setup Collabora Online in your
Nextcloud instance using NixOS, which, thanks to the amazing work of nixpkgs
maintainers, is very straightforward.
I also hope you've learnt a bit more about how WOPI works instead of it being
just :sparkles: magic :sparkles:.


[Collabora Online]: https://www.collaboraonline.com/
[nc-richdocuments]: https://apps.nextcloud.com/apps/richdocuments
[cool-request-1]: https://github.com/NixOS/nixpkgs/issues/218878
[cool-request-2]: https://github.com/NixOS/nixpkgs/issues/333457
[merged-cool]: https://github.com/NixOS/nixpkgs/pull/330708
[wopi]: https://en.wikipedia.org/wiki/Web_Application_Open_Platform_Interface
[sequence diagram]: https://help.nextcloud.com/t/collabora-integration-guide/151879
[erase-your-darlings]: https://grahamc.com/blog/erase-your-darlings/
[richdocuments-config-php]: https://github.com/nextcloud/richdocuments/blob/v8.6.1/lib/AppConfig.php
[dotfiles-commit]: https://github.com/diogotcorreia/dotfiles/commit/ef70da6198bfb1a432bb48371dba6f0ba0eb061b
[pdf-broken]: https://github.com/NixOS/nixpkgs/issues/218878#issuecomment-2471223335
