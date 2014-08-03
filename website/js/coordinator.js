
// TODO: This preamble copied from checkin.js; refactor!

g_action_url = "action.php";

$(document).ajaxSuccess(function(event, xhr, options, xmldoc) {
	var fail = xmldoc.documentElement.getElementsByTagName("failure");

	if (fail && fail.length > 0) {
		alert("Action failed: " + fail[0].textContent);
	}
});

// <reload/> element
$(document).ajaxSuccess(function(event, xhr, options, xmldoc) {
	var reload = xmldoc.documentElement.getElementsByTagName("reload");
	if (reload && reload.length > 0) {
        console.log('ajaxSuccess event: reloading page');
		location.reload(true);
	}
});

// End of preamble

// Controls for current racing group:

function handle_isracing_change() {
    console.log("change");
    console.log($("#is-currently-racing").prop('checked'));
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'advance-heat',
                   now_racing: $("#is-currently-racing").prop('checked') ? 1 : 0},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_skip_heat() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'advance-heat',
                   heat: 'next'},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_previous_heat() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'advance-heat',
                   heat: 'prev'},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function handle_manual_results() {
}

// Controls for Replay
function handle_test_replay() {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'replay-test'}
           });
}

// Controls for kiosks
// sel is the <select data-kiosk-address> input element
function handle_kiosk_page_change(sel) {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'assign-kiosk',
                   address: sel.getAttribute('data-kiosk-address'),
                   page: sel.value},
           });
}

function show_modal(modal_selector, submit_handler) {
    var modal_background = $("#modal_background");
    modal_background.css({'display': 'block',
                          'opacity': 0});
    modal_background.fadeTo(200, 0.5);

    var modal_div = $(modal_selector);
    modal_div.find("#kiosk_name_field").val(name);
    var form = modal_div.find("form");
    form.off("submit");
    form.on("submit", submit_handler);

    var modal_width = modal_div.outerWidth();
    modal_div.removeClass("hidden");
    modal_div.css({ 
        'display': 'block',
        'position': 'fixed',
        'opacity': 0,
        'z-index': 11000,
        'left' : 50 + '%',
        'margin-left': -(modal_width/2) + "px",
        'top': 100 + "px"
    });
    modal_div.fadeTo(200, 1);
}

function show_kiosk_naming_modal(address, name) {
    show_modal("#kiosk_modal", function(event) {
        handle_name_kiosk(address, $("#kiosk_name_field").val());
        return false;
    });
}

function handle_name_kiosk(address, name) {
    close_kiosk_modal();
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'assign-kiosk',
                   address: address,
                   name: name},
           });
}

function close_kiosk_modal() {
    $("#modal_background").fadeOut(200);
    $("#kiosk_modal").addClass("hidden");
    $("#kiosk_modal").css({'display': 'none'});
}


// Controls for racing rounds

function show_schedule_modal(roundid) {
    show_modal("#schedule_modal", function(event) {
        handle_schedule(roundid, $("#schedule_num_rounds").val());
        return false;
    });
}

function handle_schedule(roundid, rounds) {
    close_schedule_modal();
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'schedule',
                   roundid: roundid,
                   nrounds: rounds},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}

function close_schedule_modal() {
    $("#modal_background").fadeOut(200);
    $("#schedule_modal").addClass("hidden");
    $("#schedule_modal").css({'display': 'none'});
}

function handle_reschedule(roundid) {
    // TODO: On success
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'reschedule',
                   roundid: roundid}});
}

function handle_race(roundid) {
    $.ajax(g_action_url,
           {type: 'POST',
            data: {action: 'advance-heat',
                   roundid: roundid,
                   heat: 1,
                   now_racing: 1},
            success: function(data) { process_coordinator_poll_response(data); }
           });
}


// Generate page contents in response to coordinator-poll output

/* <current-heat now-racing= use-master-sched= classid= roundid= round=
                 group= heat= /> */

function update_for_current_round(current_heat) {
    var isracing_checkbox = $("#is-currently-racing");
    var is_racing = (current_heat.getAttribute('now-racing') == '1');

    if (isracing_checkbox.prop('checked') != is_racing) {
        isracing_checkbox.prop('checked', is_racing);
        isracing_checkbox.change();
    }
}

function generate_timer_state_group(tstate) {
    console.log(tstate.getAttribute('last_contact'));  // TODO - What form is this in?
    $("#timer_status_text").text(tstate.textContent);
    var lanes = tstate.getAttribute('lanes');
    if (lanes != '') {
        $("#lane_count").text(lanes);
    }
}

function generate_replay_state_group(host_and_port) {
    if (host_and_port == '') {
        $("#replay_status").text("NOT CONNECTED");
        $("#test_replay").addClass("hidden");
    } else {
        $("#replay_status").text("Remote replay at " + host_and_port);
        $("#test_replay").removeClass("hidden");
    }
}

function generate_kiosk_control_group(index, name, address, last_contact, assigned_page, pages) {
    var div = $("<div class=\"block_buttons\"/>");
    var elt = $("<div class=\"control_group kiosk_control\"/>");
    // TODO: Allow naming of the kiosks; otherwise it's just IP addresses
    elt.append("<p>Kiosk <span class=\"kiosk_control_name\">" + name + "</span>"
               + " <span class=\"kiosk_control_address\">" + address + "</span>"
               + "</p>");
    elt.append("<p class=\"last_contact\">Last contact: " + last_contact + "</p>");
    elt.append("<label for=\"kiosk-page-" + index + "\">Display:</label>");
    var sel = $("<select name=\"kiosk-page-" + index + "\"" 
                + " data-kiosk-address=\"" + address + "\"" 
                + " onchange=\"handle_kiosk_page_change(this)\""
                + "/>");
    for (var i = 0; i < pages.length; ++i) {
        opt = $("<option value=\"" + pages[i].path + "\">" + pages[i].brief + "</option>");
        if (assigned_page == pages[i].path) {
            opt.prop("selected", true);
        }
        sel.append(opt);
    }

    sel.appendTo(elt);
    elt.append('<input type="button" data-enhanced="true"'
               + ' onclick="show_kiosk_naming_modal(\'' + address + '\', \'' + name + '\')"'
               + ' value="Assign Name"/>');

    elt.appendTo(div);
    div.appendTo("#kiosk_control_group");
}

function generate_scheduling_control_group(roundid, round_class, round, roster_size, n_passed, n_unscheduled, 
                                           n_heats_scheduled, n_heats_run, current) {
    var elt = $("<div class=\"control_group scheduling_control\"/>");
    if (roundid == current.roundid) {
        elt.addClass('current');
    }

    elt.append('<h3>' + round_class + ', round ' + round
               + (roundid == current.roundid ? '; heat ' + current.heat + ' of ' + n_heats_scheduled : '')
               + '</h3>');
    elt.append('<p>' + roster_size + ' racer(s), ' + n_passed + ' passed, ' 
               + (n_passed - n_unscheduled) + ' scheduled.</p>');
    elt.append('<p>' + n_heats_scheduled + ' heats scheduled, ' + n_heats_run + ' run.</p>');

    var buttons = $("<div class=\"block_buttons\"/>");
    buttons.appendTo(elt);

    if (n_unscheduled > 0) {
        if (n_heats_run == 0) {
            buttons.append('<input type="button" data-enhanced="true"'
                           + ' onclick="show_schedule_modal(' + roundid + ')"'
                           + ' value="Schedule"/>');
        } else {
            buttons.append('<input type="button" data-enhanced="true"' 
                           + ' onclick="handle_reschedule(' + roundid + ')"'
                           + ' value="Reschedule"/>');
        }
    }

    if (roundid != current.roundid) {
        // TODO: Don't offer 'race' choice for single roundid under master scheduling
        if (n_heats_scheduled > 0 && n_heats_run < n_heats_scheduled) {
            buttons.append('<input type="button" data-enhanced="true"'
                           + ' onclick="handle_race(' + roundid + ')"'
                           + ' value="Race"/>');
        }

        if (n_heats_run > 0) {
            // TODO: "make changes" onclick
            buttons.append('<input type="button" data-enhanced="true" value="Make Changes"/>');
        }
    }
    
    elt.appendTo(roundid == current.roundid ? "#now-racing-group"
                 : n_heats_run < n_heats_scheduled ? "#ready-to-race-group"
                 : n_heats_run > 0 ? "#done-racing-group"
                 : "#not-yet-scheduled-group");
}

function process_coordinator_poll_response(data) {
    $(".scheduling_control_group").empty();
    var current_heat = data.getElementsByTagName("current-heat")[0];
    var current = {roundid: current_heat.getAttribute('roundid'),
                   heat: current_heat.getAttribute('heat')};
    var rounds = data.getElementsByTagName("round");

    update_for_current_round(current_heat);
    for (var i = 0; i < rounds.length; ++i) {
        var round = rounds[i];
        generate_scheduling_control_group(
            round.getAttribute('roundid'),
            round.getAttribute('class'),
            round.getAttribute('round'),
            round.getAttribute('roster_size'),
            round.getAttribute('passed'),
            round.getAttribute('unscheduled'),
            round.getAttribute('heats_scheduled'),
            round.getAttribute('heats_run'),
            current);
    }

    var timer_state = data.getElementsByTagName("timer-state")[0];
    generate_timer_state_group(timer_state);

    var replay_state = data.getElementsByTagName("replay-state")[0];
    generate_replay_state_group(replay_state.getAttribute("host-and-port"));

    var kiosk_pages = data.getElementsByTagName("kiosk-page");
    var pages = new Array(kiosk_pages.length);
    for (var i = 0; i < kiosk_pages.length; ++i) {
        pages[i] = {brief: kiosk_pages[i].getAttribute('brief'),
                    path: kiosk_pages[i].textContent};
    }

    $("#kiosk_control_group").empty();
    var kiosks = data.getElementsByTagName("kiosk");
    for (var i = 0; i < kiosks.length; ++i) {
        var kiosk = kiosks[i];
        generate_kiosk_control_group(
            i,
            kiosk.getElementsByTagName("name")[0].textContent,
            kiosk.getElementsByTagName("address")[0].textContent,
            kiosk.getElementsByTagName("last_contact")[0].textContent,
            kiosk.getElementsByTagName("assigned_page")[0].textContent,
            pages);
    }

    var racers = data.getElementsByTagName("racer");
    $("#now-racing-group").prepend("<div class='heat-lineup'><ul/></div>");
    var racers_div = $("#now-racing-group .heat-lineup ul");
    for (var i = 0; i < racers.length; ++i) {
        /*  <racer lane="1" name="Ryan Colone" carname="" carnumber="102" photo=""/> */
        racers_div.append("<li>Lane " + racers[i].getAttribute("lane")
                          + ": " + racers[i].getAttribute("name")
                          + "</li>");
    }

    $("#kiosk_control_group").trigger("create");
}

function coordinator_poll() {
    console.log("coordinator_poll");
    $.ajax(g_action_url,
           {type: 'GET',
            data: {query: 'coordinator-poll'},
            success: function(data) {
                setTimeout(coordinator_poll, 2000);
                process_coordinator_poll_response(data);
            },
            error: function() {
                setTimeout(coordinator_poll, 2000);
            }
});
}


$(function() { coordinator_poll(); });