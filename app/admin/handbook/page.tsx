import type { Metadata } from "next";
import { repo } from "@/lib/admin/repo";
import {
  Btn,
  Bullets,
  Code,
  Contents,
  H3,
  KV,
  Kbd,
  Note,
  Shot,
  Step,
} from "./parts";

export const metadata: Metadata = { title: "Handbook" };

const STEPS: Array<[string, string]> = [
  ["01", "What the site does for you"],
  ["02", "Signing in"],
  ["03", "The dashboard"],
  ["04", "The queue — your main job"],
  ["05", "Players"],
  ["06", "Writing — the bit only you can do"],
  ["07", "The Big Board"],
  ["08", "Patreon: previews and the shelf"],
  ["09", "Changing the words on the site"],
  ["10", "What everyone else sees"],
  ["11", "If something looks wrong"],
];

export default async function HandbookPage() {
  // Live rather than written down. The printed handbook's numbers were true on
  // the day it was made; these are true now, which is the point of it being a
  // page in the admin rather than a document sitting in a folder.
  const [counts, queue, writing] = await Promise.all([
    repo.getPublishedCounts(),
    repo.getQueueCounts(),
    repo.getWritingQueue(),
  ]);
  const waiting = queue["needs-tags"] + queue.ambiguous;
  const unwritten =
    writing.concepts.filter((c) => c.text == null).length +
    writing.players.filter((p) => p.text == null).length;

  return (
    <article className="flex flex-col gap-10 pb-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-red">
          coachhayeshudl.com — running the site
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Film Room Handbook
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Everything you need to keep the site current. Most weeks it&rsquo;s
          one screen and a few minutes.
        </p>

        <div className="mt-6 max-w-2xl rounded-lg border-l-4 border-brand-red bg-brand-red/5 p-5">
          <h2 className="text-lg font-semibold text-white">Your weekly rep</h2>
          <p className="mt-2 text-sm text-zinc-300">
            After you post new videos to YouTube:
          </p>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-300 marker:text-zinc-600">
            <li>
              Open <strong className="text-white">Queue</strong>. Hit{" "}
              <Btn>Confirm</Btn> on anything tagged right; fix the ones that
              aren&rsquo;t.
            </li>
            <li>
              Open <strong className="text-white">Writing</strong> and do two or
              three. Not all of them — just the ones at the top.
            </li>
          </ol>
          <p className="mt-3 text-sm text-zinc-400">
            Confirming a video puts it on the site. Writing is what makes the
            page worth finding.
          </p>
        </div>
      </header>

      <Contents steps={STEPS} />

      <Step n="01" title="What the site does for you">
        <p>
          Every video you post to YouTube gets pulled in automatically — title,
          thumbnail, the lot. The site then reads the title and takes a guess at{" "}
          <strong className="text-white">who&rsquo;s in it</strong> and{" "}
          <strong className="text-white">what concept it shows</strong>.
        </p>
        <p>
          When it&rsquo;s confident, it publishes on its own. When it
          isn&rsquo;t, it puts the video in a queue and waits for you.
        </p>
        <p>
          You are never typing in video details by hand. What you do is confirm
          the guesses, and add the words a machine can&rsquo;t write.
        </p>
        <Note label="Where things stand right now">
          <p>
            <strong className="text-white">{counts.videos} videos</strong> are
            live on the site.{" "}
            {waiting > 0 ? (
              <>
                Another{" "}
                <strong className="text-white">{waiting} are waiting</strong> in
                the queue — each one is a page nobody can find yet.
              </>
            ) : (
              <>The queue is empty. Nothing is waiting on you.</>
            )}
          </p>
          {unwritten > 0 && (
            <p>
              <strong className="text-white">{unwritten} pages</strong> have no
              description written yet. See step 06.
            </p>
          )}
        </Note>
      </Step>

      <Step n="02" title="Signing in">
        <p>
          Go to <Code>coachhayeshudl.com/admin</Code> and enter your password.
          There&rsquo;s no username.
        </p>
        <KV
          rows={[
            ["Address", <Code key="a">coachhayeshudl.com/admin</Code>],
            ["Password", "The one you set up. Keep it in your password manager."],
            ["Stays signed in", "12 hours, then it asks again"],
          ]}
        />
        <p>
          The admin isn&rsquo;t linked from anywhere on the site, and search
          engines are told to ignore it. Nobody finds it by accident.
        </p>
        <Shot
          src="01-login"
          alt="The admin sign-in screen: a single password field on a black page"
          caption="The sign-in screen. One password, no username."
        />
      </Step>

      <Step n="03" title="The dashboard">
        <p>
          First screen after you sign in. It answers one question:{" "}
          <strong className="text-white">is there anything for me to do?</strong>
        </p>
        <p>
          The three boxes across the top are your queue. If they&rsquo;re all
          zero, the confirming is done. The row underneath is the scoreboard:
          how much is live right now.
        </p>
        <p>
          Across the top you&rsquo;ll find the places you can go. Most you&rsquo;ll
          use rarely; <strong className="text-white">Queue</strong> and{" "}
          <strong className="text-white">Writing</strong> are the two that matter
          week to week.
        </p>
        <Shot
          src="02-dashboard"
          alt="The admin dashboard showing counts for needs tags, ambiguous and unmatched, plus totals for live videos, players, concepts and topics"
          caption="Top row is work to do; bottom row is what's already live."
        />
      </Step>

      <Step n="04" title="The queue — your main job">
        <p>
          The screen you&rsquo;ll actually live in. Three tabs, and they need
          different things from you:
        </p>
        <KV
          rows={[
            [
              "Needs tags",
              "The site made a guess and wants a second opinion. Check the names and concepts, then confirm.",
            ],
            [
              "Ambiguous",
              "Several players share a surname and it won't guess between them. Pick the right one, then confirm.",
            ],
            [
              "Unmatched",
              "It found nothing — usually older motivational shorts. Tick them and archive the lot in one go.",
            ],
          ]}
        />
        <H3>Working a video</H3>
        <Bullets
          items={[
            <>
              <strong className="text-white">Tags look right?</strong> Hit{" "}
              <Btn>Confirm</Btn>. It goes live.
            </>,
            <>
              <strong className="text-white">Wrong name?</strong> Click the{" "}
              <Code>×</Code> on the chip to remove it, use <Btn>+ add</Btn> to
              pick the right one, then confirm.
            </>,
            <>
              <strong className="text-white">Not sure?</strong>{" "}
              <Btn>Watch ↗</Btn> opens the video on YouTube in a new tab.
            </>,
          ]}
        />
        <Note label="Faster">
          <p>
            Press <Kbd>j</Kbd> and <Kbd>k</Kbd> to move down and up the list, and{" "}
            <Kbd>↵</Kbd> to confirm the one you&rsquo;re on. You can clear a lot
            of videos without touching the mouse.
          </p>
        </Note>
        <Shot
          src="03-queue"
          alt="The review queue showing videos with pre-filled player and concept tags and Confirm, Edit and Watch buttons"
          caption="Suggestions arrive pre-filled. Most of the time you're just agreeing."
        />
        <H3>The Unmatched tab</H3>
        <p>
          Videos with nothing worth tagging. Rather than working them one at a
          time, use <Btn>Select all</Btn> then <Btn>Archive selected</Btn>.
        </p>
        <p>
          Archiving{" "}
          <strong className="text-white">does not delete anything</strong>. The
          video stays in the system and keeps its tags — it just doesn&rsquo;t
          get its own page.
        </p>
        <Shot
          src="04-queue-unmatched"
          alt="The unmatched tab of the queue with checkboxes, a Select all button and an Archive selected button"
          caption="Bulk archive. Nothing is deleted — these just don't earn a page."
        />
      </Step>

      <Step n="05" title="Players">
        <p>
          Everyone the site knows about, pre-loaded from Georgia&rsquo;s rosters.
          You shouldn&rsquo;t need to add people by hand.
        </p>
        <p>
          The default view hides players with no film and no Big Board slot —
          otherwise you&rsquo;d scroll past a couple of hundred names that
          don&rsquo;t do anything.
        </p>
        <Shot
          src="05-players"
          alt="The players list showing name, position, video count, status and Big Board columns"
          caption="Players with film or a board slot, most breakdowns first."
        />
        <H3>The one field worth your time</H3>
        <p>
          Open a player and you&rsquo;ll see{" "}
          <strong className="text-white">Aliases</strong>. This is the
          highest-value thing on the whole page.
        </p>
        <p>
          If you call someone &ldquo;C.J.&rdquo; in your titles but the roster
          says &ldquo;Christopher&rdquo;, add <Code>C.J.</Code> as an alias. From
          then on the site tags him automatically and he stops showing up in your
          queue.
        </p>
        <p>
          <strong className="text-white">
            Every alias you add is queue work you never do again.
          </strong>
        </p>
        <p>
          The greyed-out box at the top is roster data — height, weight,
          hometown. You can&rsquo;t edit it and you don&rsquo;t need to; it
          updates itself.
        </p>
        <Shot
          src="06-player-edit"
          alt="A player detail page showing read-only roster data above an editable section with status, Big Board toggle, aliases and a notes field"
          caption="Grey box on top is automatic. Everything below it is yours."
        />
      </Step>

      <Step n="06" title="Writing — the bit only you can do">
        <p>
          A player page or a playbook page is currently a heading and a grid of
          thumbnails. Fine for someone who already knows what they&rsquo;re
          looking at. Thin for Google, and thin for a stranger.
        </p>
        <p>
          Two or three sentences fixes that. The{" "}
          <strong className="text-white">Writing</strong> tab is where you do it,
          and it&rsquo;s built so you never have to hunt.
        </p>
        <H3>How it&rsquo;s ordered</H3>
        <Bullets
          items={[
            <>
              Anything <strong className="text-white">not yet written</strong>{" "}
              comes first.
            </>,
            <>
              Within that, the pages with the{" "}
              <strong className="text-white">most film behind them</strong> come
              first.
            </>,
          ]}
        />
        <p>
          So the top of the list is always where a paragraph buys you the most.
          Do three and stop — the order will still be right next week.
        </p>
        <Note label="You don't have to think of it cold">
          <p>
            Under each name is a <strong className="text-white">From:</strong>{" "}
            line listing your own video titles that feed that page. That&rsquo;s
            the material. For <em>Buck Sweep</em> it might be your Micah Morris
            breakdown and the HazeBringer short — write what those have in
            common.
          </p>
        </Note>
        <H3>What to write</H3>
        <KV
          rows={[
            [
              "A concept",
              "What it is and what it's trying to do. “Buck sweep pulls the backside guard and the fullback kicks out. It's the sweep with the play-side blocking already accounted for.”",
            ],
            [
              "A player",
              "What he does well, what he's working on, why his film is worth a look.",
            ],
          ]}
        />
        <p>
          Write several, then press <Btn>Save</Btn> once. It saves everything
          you&rsquo;ve changed across both tabs, not just what&rsquo;s on screen.
        </p>
        <p>
          Clearing a box puts the page back to having no paragraph. Nothing
          breaks.
        </p>
        <Shot
          src="17-writing"
          alt="The Writing tab showing concepts ordered with unwritten first, each with its source video titles and an empty text box"
          caption="Unwritten first, most film first. The From: line under each name is your own video titles — that's what you're writing from."
        />
      </Step>

      <Step n="07" title="The Big Board">
        <p>
          The Big Board works differently, because recruits aren&rsquo;t on any
          Georgia roster yet — nothing can look them up for you.
        </p>
        <p>
          So you keep them in a{" "}
          <strong className="text-white">Google Sheet</strong>, which is the
          comfortable place to type a list, and pull that sheet into the site
          when you&rsquo;re ready.
        </p>
        <H3>Doing it</H3>
        <Bullets
          items={[
            <>
              Fill in your sheet. Tick the <Code>Published</Code> box on anyone
              who should appear.
            </>,
            <>
              In the sheet:{" "}
              <strong className="text-white">
                File → Share → Publish to web → CSV → Publish
              </strong>
              . Copy the link it gives you.
            </>,
            <>
              Paste that link into{" "}
              <strong className="text-white">Import</strong> and press{" "}
              <Btn>Preview changes</Btn>.
            </>,
            <>
              Read what it&rsquo;s about to do, then <Btn>Apply</Btn>.
            </>,
          ]}
        />
        <Note label="Nothing happens until you say so">
          <p>
            Preview shows exactly what will change — who&rsquo;s new,
            who&rsquo;s different and what&rsquo;s different about them, and any
            rows it had to skip. Nothing is written until you press Apply.
          </p>
        </Note>
        <Shot
          src="09-import"
          alt="The import screen with a field for a published CSV URL and a Preview changes button"
          caption="Paste the sheet link once. After that it's a button."
        />
      </Step>

      <Step n="08" title="Patreon: previews and the shelf">
        <p>
          Patreon won&rsquo;t let another website play your paid video.
          There&rsquo;s no way around that, and you wouldn&rsquo;t want one —
          your patrons paid for it.
        </p>
        <p>
          What the site does instead is{" "}
          <strong className="text-white">send people to it</strong>, two ways.
        </p>
        <H3>1. Mark a video as a preview</H3>
        <p>
          Cut a short preview of a Patreon breakdown and post it to YouTube like
          anything else. When it turns up in your queue, open it and paste the
          Patreon post link into{" "}
          <strong className="text-white">Patreon post</strong>.
        </p>
        <p>
          That does three things: the film page gets a{" "}
          <em>&ldquo;the full breakdown is on Patreon&rdquo;</em> button right
          under the video, the card gets a <Btn>Preview</Btn> badge, and the post
          appears on your shelf automatically.
        </p>
        <Note label="It has to be the post, not the page">
          <p>
            Use the link to the{" "}
            <strong className="text-white">specific post</strong> —{" "}
            <Code>patreon.com/CoachHayesHudl/posts/…</Code>. Your main Patreon
            page won&rsquo;t be accepted, on purpose: that link is already in the
            description of nearly every video you&rsquo;ve posted, and taking it
            would badge your whole back catalogue as a preview.
          </p>
        </Note>
        <Shot
          src="15-film-preview-cta"
          alt="A film page with a red call-to-action panel under the video reading: this is a preview, the full breakdown is on Patreon"
          caption="Someone watches the teaser, and the ask is right there under it."
        />
        <H3>2. The shelf</H3>
        <p>
          The <strong className="text-white">Patreon</strong> tab is a list of
          posts you want shown on the site. Press <Btn>Add a post</Btn> and fill
          in four things: the link, a title, a one-line teaser, and the date you
          posted it.
        </p>
        <p>
          Leave{" "}
          <strong className="text-white">Show this on the website</strong>{" "}
          unticked while you&rsquo;re drafting. Tick it when you&rsquo;re ready.
        </p>
        <p>
          If a preview clip already points at that post, the card borrows the
          clip&rsquo;s thumbnail and sends people to the preview first. If
          there&rsquo;s no clip yet, you can give it an image link, or leave it
          plain.
        </p>
        <Shot
          src="20-patreon-admin"
          alt="The Patreon shelf admin screen listing posts with live and draft badges and an Add a post button"
          caption="The shelf. Draft until you tick the box."
        />
        <Shot
          src="21-patreon-new"
          alt="The add-a-post form with fields for the Patreon link, title, teaser, date posted and artwork"
          caption="Adding one. The artwork section tells you whether a preview clip is already covering it."
        />
        <p>
          Everything on the shelf shows up on <Code>/patreon</Code>, and the
          three newest appear on the home page under the Patreon block.
        </p>
        <Shot
          src="14-public-patreon"
          alt="The public Patreon page showing three cards for full film studies"
          caption="What visitors see. The first card has a preview clip on the site; the other two go straight to Patreon."
        />
      </Step>

      <Step n="09" title="Changing the words on the site">
        <p>
          Headings, paragraphs and button labels on the public pages are yours to
          change. <strong className="text-white">Content</strong> lists the
          pages; open one and you get every bit of text on it in a box.
        </p>
        <H3>How the boxes work</H3>
        <Bullets
          items={[
            <>
              A box showing grey text is showing you the{" "}
              <strong className="text-white">wording the site came with</strong>.
              Leave it and nothing changes.
            </>,
            <>Type in it and yours replaces it.</>,
            <>
              <Btn>Reset to default</Btn> — or just clearing the box — puts the
              original wording back. You can&rsquo;t lose it.
            </>,
          ]}
        />
        <p>Changes are live within a few seconds. Nothing needs rebuilding.</p>
        <Note label="Two to know about">
          <p>
            <strong className="text-white">Search description</strong> is the
            grey line under your title in Google results. The counter turns red
            past 160 characters, because Google cuts it off there.
          </p>
          <p>
            On the home page headline, anything you wrap in{" "}
            <Code>*asterisks*</Code> comes out red — that&rsquo;s how
            &ldquo;fundamentals&rdquo; is styled today.
          </p>
        </Note>
        <Shot
          src="18-content"
          alt="The Content tab listing pages, each marked default or with a count of changed fields"
          caption="The badge tells you which ones you've touched."
        />
        <Shot
          src="19-content-page"
          alt="The home page content editor showing boxes for search description, hero headline and hero paragraph with grey default text"
          caption="Grey text is the wording it came with. Type over it, or leave it alone."
        />
      </Step>

      <Step n="10" title="What everyone else sees">
        <p>
          This is the point of the queue work. Every player you confirm film for
          gets a page of their own — and those pages are what turn up when
          somebody searches a player&rsquo;s name.
        </p>
        <Shot
          src="11-public-players"
          alt="The public players index grouped by position, showing cards with thumbnails and breakdown counts"
          caption="The players index, grouped by position. Built from your confirmed film."
        />
        <Shot
          src="12-public-player"
          alt="A public player page showing measurements, hometown, film breakdowns and clips"
          caption="Measurements and hometown fill themselves in; the film is what you confirmed."
        />
        <H3>Position rooms</H3>
        <p>
          Every position group gets its own page too, gathering the players and
          the film for that room. Shorts count here — a room with no long
          breakdowns still has plenty to show.
        </p>
        <Shot
          src="16-position-hub"
          alt="The defensive line position page showing seven player chips and a grid of eight clips"
          caption="The defensive line room. No long breakdowns yet, so the clips carry it."
        />
      </Step>

      <Step n="11" title="If something looks wrong">
        <H3>A video I confirmed isn&rsquo;t on the site</H3>
        <p>
          Give it a minute and refresh. If it&rsquo;s still missing, open the
          video from the queue and check{" "}
          <strong className="text-white">Published</strong> is switched on.
        </p>
        <H3>A thumbnail is a grey box</H3>
        <p>
          That means the video is gone from YouTube — deleted, or set to private.
          Open it from the queue and switch{" "}
          <strong className="text-white">Published</strong> off; the page and the
          grey box both disappear.
        </p>
        <H3>The same player keeps coming back in my queue</H3>
        <p>
          Add an alias for the name you actually use in titles. That fixes it
          permanently rather than one video at a time.
        </p>
        <H3>It won&rsquo;t take my Patreon link</H3>
        <p>
          You&rsquo;ve probably pasted your main Patreon page. It needs the link
          to the individual post — the one with <Code>/posts/</Code> in it.
        </p>
        <H3>I changed some wording and it looks the same</H3>
        <p>
          Give it a few seconds and refresh. If you were looking at the page in
          another tab, that tab is showing you the old copy until you reload it.
        </p>
        <H3>It signed me out</H3>
        <p>Normal — sessions last 12 hours. Sign back in.</p>
        <H3>A player page shows the wrong status</H3>
        <p>
          Open the player and change{" "}
          <strong className="text-white">Status</strong>. Roster data updates
          itself, but where someone is in their career is your call.
        </p>
        <H3>Something&rsquo;s actually broken</H3>
        <p>
          Take a screenshot of the whole window, note what you clicked just
          before it happened, and send both over. Those two things solve most of
          it.
        </p>
      </Step>
    </article>
  );
}
