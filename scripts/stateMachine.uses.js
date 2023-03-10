// ==UserScript==
// @name         util::stateMachine
// @downloadURL  https://github.com/dangh/user-scripts/raw/master/scripts/stateMachine.user.js
// @match        <all_urls>
// @version      0.0.1
// @run-at       document-start
// ==/UserScript==

unsafeWindow.stateMachine = function stateMachine({ states, guards, actions, onStart, onTransition }) {
  let normalizeFunctions = (functions, map) => {
    functions = [].concat(functions || []);
    return functions.map((f) => {
      if (typeof f == 'string') f = map[f];
      return f;
    });
  };
  let normalizeTransitions = (transitions) => {
    transitions = [].concat(transitions || []);
    return transitions.map((transition) => {
      if (typeof transition == 'string') transition = { target: transition };
      else transition = { ...transition };
      transition.cond = normalizeFunctions(transition.cond, guards);
      transition.actions = normalizeFunctions(transition.actions, actions);
      return transition;
    });
  };
  let normalizeState = (state) => {
    state = { ...state };
    state.entry = normalizeFunctions(state.entry, actions);
    state.exit = normalizeFunctions(state.exit, actions);
    state.always = normalizeTransitions(state.always);
    state.after = { ...state.after };
    Object.entries(state.after).forEach(([ms, transitions]) => (state.after[ms] = normalizeTransitions(transitions)));
    state.on = { ...state.on };
    Object.entries(state.on).forEach(([event, transitions]) => (state.on[event] = normalizeTransitions(transitions)));
    return state;
  };

  // normalize states
  states = { ...states };
  Object.keys(states).forEach((key) => {
    if (key != 'initial') states[key] = normalizeState(states[key]);
  });

  return {
    leave(context, event) {
      context.pendingTransitionTimers?.forEach(clearTimeout);
      context.pendingTransitionTimers = [];

      states[context.state].exit.forEach((f) => f.call(this, context, event));
    },
    enter(context, state, event) {
      let target = states[state];
      target.entry.forEach((f) => f.call(this, context, event));

      let transition = target.always.find((t) => t.cond.every((f) => f.call(this, context, event)));
      if (transition) {
        this.transition(context, transition, { type: '#always' });
      }

      for (let [ms, transitions] of Object.entries(target.after)) {
        let transition = transitions.find((t) => t.cond.every((f) => f.call(this, context, event)));
        if (transition) {
          let timer = setTimeout(() => {
            this.transition(context, transition, event);
          }, Number(ms));

          if (!context.pendingTransitionTimers) context.pendingTransitionTimers = [];
          context.pendingTransitionTimers.push(timer);
        }
      }
    },
    start(context) {
      context.state = states.initial;
      if (onStart) onStart.call(this, context);
      if (context.state == states.initial) {
        // only enter initial state if start hook didn't transition
        this.enter(context, states.initial);
      }
    },
    send(context, event) {
      if (typeof event == 'string') event = { type: event };
      let state = context.state || states.initial;
      let transitions = states[state].on[event.type];
      if (transitions) {
        let transition = transitions.find((t) => t.cond.every((f) => f.call(this, context, event)));
        if (transition) {
          this.transition(context, transition, event);
        }
      }
    },
    transition(context, transition, event) {
      this.leave(context, event);

      [context.previousState, context.state] = [context.state, transition.target];
      transition.actions.forEach((f) => f.call(this, context, event));
      if (onTransition) {
        onTransition.call(this, context, transition, event);
      }

      this.enter(context, transition.target, event);
    },
  };
};
