const ES = require("eventsource");
const irc = require("irc");

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
  console.error("--- Encountered error", event);
};

eventSource.onmessage = function(event) {
  const change = JSON.parse(event.data);
  let msg = "";
  if (change.wiki === wiki) {
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
        msg = `[[${title}]] `;
        if (minor) msg += "M";
        if (bot) msg += "B";
        msg += ` ${uri} * ${user} * (${sign}${size})`;
        if (comment) msg += ` ${comment}`;
      }
      // new page created action
      else if (type == "new") {
        const uri = `${server_url}${server_script_path}/index.php?oldid=${revision["new"]}&rcid=${id}`;
        const size = length["new"];
        msg = `[[${title}]] ${
          !patrolled ? "!" : ""
        }N ${uri} * ${user} * (+${size})`;
        if (comment) msg += ` ${comment}`;
      }
      // log actions
      else if (type == "log") {
        const { log_action, log_type } = change;
        // review log
        if (change.log_type == "review") {
          msg = `[[Special:Log/review]] ${log_action}`;
          if (bot) msg += "B";
          msg += `  * ${user} *  ${log_action_comment}`;
        }
        // delete log
        else if (log_type == "delete") {
          msg = `[[Special:Log/delete]] ${log_action}`;
          if (bot) msg += "B";
          msg += `  * ${user} *  ${
            log_action == "delete" ? "deleted" : "DID SOMETHING ELSE"
          } "[[${title}]]"`;
          if (comment) msg += " " + comment;
        }
        // new account log
        // to implement
        // other log actions
        else ircClient.say("acagastya", JSON.stringify(change));
      }
      // other actions
      else ircClient.say("acagastya", JSON.stringify(change));
      ircClient.say(channel, msg);
    } catch (error) {
      msg = JSON.stringify(change);
      msg += "\n--- error";
      ircClient.say("acagastya", msg);
    }
  }
};
