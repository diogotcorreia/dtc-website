+++
title = "Migrating Immich from Docker to NixOS"

[taxonomies]
tags = ["immich", "nixos", "sysadmin"]
+++

This is a quick post on how I migrated my Immich deployment from
Docker to a native NixOS module, and how you can do the same.
<!-- more -->

I'm going to preface this post by saying that my Immich Docker deployment
was [already being managed by NixOS][immich-docker] and therefore I was
already using the host's PostgreSQL database, which makes this an easier
migration.
If you are migrating from a standard docker-compose Immich setup,
consider taking a look at [Scrumplex's excellent migration guide][migration-pr]
instead, which is unfortunately only available as an open PR on nixpkgs
(at the time of writing).

Additionally, all of the steps below were done on Immich 1.123.0, so
things might change on future versions.

## Why?

While the Docker setup worked, it was very slow (`systemd-analyze blame` was
showing the Immich container taking considerable time to start) and required me
to perform manual updates every time a new Immich release came out.

With the Immich NixOS module, everything is now handled by nixpkgs maintainers
and there's very little maintenance (and configuration!) to do on my side.

## Preparation

Before proceeding, it is extremely advisable to [perform backups] of both the
database and the media library.

Additionally, while migrating data (and before running the backups), turn off
the Immich container(s).
With my setup, that could be done by stopping the respective systemd units:

```sh
systemctl stop docker-immich_server.service
systemctl stop docker-immich_machine_learning.service
```

## Migrating Configuration

Since my setup was already handled by NixOS, some things were already configured.
Therefore, my configuration changes consisted only of throwing away the container
configurations and replacing them with the [`services.immich` module][immich-module]:

```nix
{
  # ...
  services.immich = {
    enable = true;
    port = immichPort; # TODO: change to yours
    mediaLocation = photosLocation; # TODO: change to yours

    settings = {
      # TODO: configure or change to `null`
    };
  };
}
```

I was also able to throw away the database and redis configuration, since those
are now handled by the Immich NixOS module.

You can find the [full diff in this commit][diff-commit].
My setup also includes mounting some network shares, but that is out of the
scope of this blog post.

After rebuilding the configuration, stop Immich again so that we can proceed to
migrate the database:

```sh
systemctl stop immich-server.service
systemctl stop immich-machine-learning.service
```

## Migrating Database

Since Immich stores file paths in the database, those are now outdated and
don't point to the correct files.
For reference, the file paths in the database start with `upload/...` while
my `mediaLocation` is set to `/persist/immich`.

The approach in the aforementioned migration guide is to backup the database
to a file and perform a find and replace search there, from `upload/` to the
new media location path.
However, since my database doesn't need to be moved, I wanted to do the same
without having to dump and restore it.

Therefore, I took a look at the schema (and data) to find which columns store
file paths, listed below in the format `table_name.column_name`:

- `asset_files.path`
- `assets.originalPath`
- `assets.encodedVideoPath`
- `assets.sidecarPath`
- `move_history.oldPath`
- `move_history.newPath`
- `person.thumbnailPath`
- `users.profileImagePath`

Taking advantage of PostgreSQL's [`regexp_replace`] function, we can perform
a find and replace directly in the database by opening a shell:

```sh
sudo -u postgres psql immich
```

```sql
--- start a transaction to allow rollback if something goes wrong
START TRANSACTION;

UPDATE "asset_files" SET "path" = regexp_replace("path", '^upload/', '/persist/immich/');
UPDATE "assets" SET "originalPath" = regexp_replace("originalPath", '^upload/', '/persist/immich/');
UPDATE "assets" SET "encodedVideoPath" = regexp_replace("encodedVideoPath", '^upload/', '/persist/immich/');
UPDATE "assets" SET "sidecarPath" = regexp_replace("sidecarPath", '^upload/', '/persist/immich/');
UPDATE "move_history" SET "oldPath" = regexp_replace("oldPath", '^upload/', '/persist/immich/');
UPDATE "move_history" SET "newPath" = regexp_replace("newPath", '^upload/', '/persist/immich/');
UPDATE "person" SET "thumbnailPath" = regexp_replace("thumbnailPath", '^upload/', '/persist/immich/');
UPDATE "users" SET "profileImagePath" = regexp_replace("profileImagePath", '^upload/', '/persist/immich/');

--- check if everything is fine (in the same shell) before commiting
COMMIT;

--- abort if something is wrong
--- ABORT;
```

Don't forget to change `/persist/immich` to your own media location.

You can now turn Immich back on with:

```sh
systemctl start immich-server.service
systemctl start immich-machine-learning.service
```

## Conclusion

In this post, we took a look at migrating an existing Immich deployment from Docker
to the NixOS module, assuming that the database is already being handled
by NixOS.

[immich-docker]: https://github.com/diogotcorreia/dotfiles/blob/f178ca8f9f6465c9dbd6054be61991d249758022/hosts/hera/immich.nix
[migration-pr]: https://github.com/NixOS/nixpkgs/pull/344300
[perform backups]: https://immich.app/docs/administration/backup-and-restore/
[immich-module]: https://search.nixos.org/options?query=services.immich
[diff-commit]: https://github.com/diogotcorreia/dotfiles/commit/b89ad11e06aa82c810adb1f51b33cf151c84fe8f
[`regexp_replace`]: https://www.postgresql.org/docs/16/functions-matching.html
