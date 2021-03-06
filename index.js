const ES = require("eventsource");
const irc = require("irc");
const c = require("irc-colors");

const { API, botName, channel, server, wiki } = require("./config");

const ircClient = new irc.Client(server, botName, { channels: [channel] });
ircClient.addListener("error", function(message) {
  console.log("error: ", message);
});

console.log("Connecting to the event stream...");
const eventSource = new ES(API);

eventSource.onopen = function(event) {
  console.log("--- Opened connection.");
};

eventSource.onerror = function(event) {
  const knownError = { type: "error" };
  const knownErrStr = JSON.stringify(knownError);
  const eventStr = JSON.stringify(event);
  if (eventStr != knownErrStr) {
    ircClient.say("acagastya", eventStr + "\n --- error");
    console.error("--- Encountered error", event);
  }
};

eventSource.onmessage = function(event) {
  const change = JSON.parse(event.data);
  let msg = "";
  if (change.wiki == wiki) {
    const {
      bot,
      comment,
      id,
      length,
      log_action_comment,
      minor,
      patrolled,
      revision,
      server_script_path,
      title,
      server_url,
      type,
      user
    } = change;
    try {
      // edit action
      if (type == "edit") {
        const uri = `${server_url}${server_script_path}/index.php?diff=${revision["new"]}&oldid=${revision.old}`;
        const size = length["new"] - length["old"];
        const sign = size >= 0 ? "+" : "";
        msg = `[[${c.olive(title)}]] `;
        if (minor) msg += `${c.red("M")}`;
        if (bot) msg += `${c.red("B")}`;
        msg += ` ${c.navy(uri)} ${c.maroon("*")} ${c.green(user)} ${c.maroon(
          "*"
        )} (${sign}${size})`;
        if (comment) msg += ` ${c.teal(comment)}`;
      }
      // categorize action -- leave empty
      else if (type == "categorize") {
      }
      // new page created action
      else if (type == "new") {
        const uri = `${server_url}${server_script_path}/index.php?oldid=${revision["new"]}&rcid=${id}`;
        const size = length["new"];
        msg = `[[${c.olive(title)}]] ${!patrolled ? c.red("!") : ""}${c.red(
          "N"
        )} ${c.navy(uri)} ${c.maroon("*")} ${c.green(user)} ${c.maroon(
          "*"
        )} (+${size})`;
        if (comment) msg += ` ${c.teal(comment)}`;
      }
      // log actions
      else if (type == "log") {
        const { log_action, log_type } = change;
        msg = `[[${c.olive("Special:Log/")}${c.olive(log_type)}]] ${c.red(
          log_action
        )} `;
        if (bot) msg += c.red("B");
        msg += ` ${c.maroon("*")} ${c.green(user)} ${c.maroon("*")}  `;
        if (comment)
          msg += `${c.teal(log_action_comment.replace(/&quot;/g, '"'))}`;
      }
      ircClient.say(channel, msg);
    } catch (error) {
      msg = JSON.stringify(change);
      msg += "\n--- error";
      ircClient.say("acagastya", msg);
    }
  }
};
