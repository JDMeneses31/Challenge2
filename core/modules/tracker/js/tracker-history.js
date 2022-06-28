/**
* DO NOT EDIT THIS FILE.
* See the following change record for more information,
* https://www.drupal.org/node/2815083
* @preserve
**/

(function ($, Drupal, window) {
  function processNodeNewIndicators(placeholders) {
    var newNodeString = Drupal.t('new');
    var updatedNodeString = Drupal.t('updated');
    placeholders.forEach(function (placeholder) {
      var timestamp = parseInt(placeholder.getAttribute('data-history-node-timestamp'), 10);
      var nodeID = placeholder.getAttribute('data-history-node-id');
      var lastViewTimestamp = Drupal.history.getLastRead(nodeID);

      if (timestamp > lastViewTimestamp) {
        var message = lastViewTimestamp === 0 ? newNodeString : updatedNodeString;
        $(placeholder).append("<span class=\"marker\">".concat(message, "</span>"));
      }
    });
  }

  function processNewRepliesIndicators(placeholders) {
    var placeholdersToUpdate = {};
    placeholders.forEach(function (placeholder) {
      var timestamp = parseInt(placeholder.getAttribute('data-history-node-last-comment-timestamp'), 10);
      var nodeID = placeholder.previousSibling.previousSibling.getAttribute('data-history-node-id');
      var lastViewTimestamp = Drupal.history.getLastRead(nodeID);

      if (timestamp > lastViewTimestamp) {
        placeholdersToUpdate[nodeID] = placeholder;
      }
    });
    var nodeIDs = Object.keys(placeholdersToUpdate);

    if (nodeIDs.length === 0) {
      return;
    }

    $.ajax({
      url: Drupal.url('comments/render_new_comments_node_links'),
      type: 'POST',
      data: {
        'node_ids[]': nodeIDs
      },
      dataType: 'json',
      success: function success(results) {
        Object.keys(results || {}).forEach(function (nodeID) {
          if (placeholdersToUpdate.hasOwnProperty(nodeID)) {
            var url = results[nodeID].first_new_comment_link;
            var text = Drupal.formatPlural(results[nodeID].new_comment_count, '1 new', '@count new');
            $(placeholdersToUpdate[nodeID]).append("<br /><a href=\"".concat(url, "\">").concat(text, "</a>"));
          }
        });
      }
    });
  }

  Drupal.behaviors.trackerHistory = {
    attach: function attach(context) {
      var nodeIDs = [];
      var nodeNewPlaceholders = once('history', '[data-history-node-timestamp]', context).filter(function (placeholder) {
        var nodeTimestamp = parseInt(placeholder.getAttribute('data-history-node-timestamp'), 10);
        var nodeID = placeholder.getAttribute('data-history-node-id');

        if (Drupal.history.needsServerCheck(nodeID, nodeTimestamp)) {
          nodeIDs.push(nodeID);
          return true;
        }

        return false;
      });
      var newRepliesPlaceholders = once('history', '[data-history-node-last-comment-timestamp]', context).filter(function (placeholder) {
        var lastCommentTimestamp = parseInt(placeholder.getAttribute('data-history-node-last-comment-timestamp'), 10);
        var nodeTimestamp = parseInt(placeholder.previousSibling.previousSibling.getAttribute('data-history-node-timestamp'), 10);

        if (lastCommentTimestamp === nodeTimestamp) {
          return false;
        }

        var nodeID = placeholder.previousSibling.previousSibling.getAttribute('data-history-node-id');

        if (Drupal.history.needsServerCheck(nodeID, lastCommentTimestamp)) {
          if (nodeIDs.indexOf(nodeID) === -1) {
            nodeIDs.push(nodeID);
          }

          return true;
        }

        return false;
      });

      if (nodeNewPlaceholders.length === 0 && newRepliesPlaceholders.length === 0) {
        return;
      }

      Drupal.history.fetchTimestamps(nodeIDs, function () {
        processNodeNewIndicators(nodeNewPlaceholders);
        processNewRepliesIndicators(newRepliesPlaceholders);
      });
    }
  };
})(jQuery, Drupal, window);