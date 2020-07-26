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
  let msg;
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
    if (type == "edit") {
      const uri = `${server_url}${server_script_path}/index.php?diff=${revision["new"]}&oldid=${revision.old}`;
      const size = length["new"] - length["old"];
      const sign = size >= 0 ? "+" : "";
      msg = `[[${title}]] `;
      if (minor) msg += "M";
      if (bot) msg += "B";
      msg += ` ${uri} * ${user} * (${sign}${size})`;
      if (comment) msg += ` ${comment}`;
    } else if (type == "new") {
      const uri = `${server_url}${server_script_path}/index.php?oldid=${revision["new"]}&rcid=${id}`;
      const size = length["new"];
      msg = `[[${title}]] ${
        !patrolled ? "!" : ""
      }N ${uri} * ${user} * (+${size})`;
      if (comment) msg += ` ${comment}`;
    } else if (type == "log") {
      msg = `[[Special:Log/${change.log_type}]] ${change.log_action} `;
      if (bot) msg += "B";
      msg += ` * ${user} * `;
      if (log_action_comment != "New user account")
        msg += ` ${
          log_action == "delete" ? "deleted" : log_action
        }  [[${title}]]`;
      else if (comment) msg += `: ${comment}`;
    } else msg = JSON.stringify(change);
    ircClient.say(channel, msg);
  }
};
