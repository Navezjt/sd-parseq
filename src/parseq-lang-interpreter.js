import nearley from 'nearley';
import getGrammar from './parseq-lang.js';
import { linear, polynomial, step } from 'everpolate';
import Spline from 'cubic-spline';
import BezierEasing from "bezier-easing";


export function defaultInterpolation(definedFrames, definedValues, frame) {
  return linear_interpolation(definedFrames, definedValues, frame);
}

function linear_interpolation(definedFrames, definedValues, frame) {
  return linear(frame, definedFrames, definedValues)[0];
}

function cubic_spline_interpolation(definedFrames, definedValues, frame) {
  const spline = new Spline(definedFrames, definedValues);
  return spline.at(frame);
}

function poly_interpolation(definedFrames, definedValues, frame) {
  return polynomial(frame, definedFrames, definedValues)[0];
}

function step_interpolation(definedFrames, definedValues, frame) {
  return step(frame, definedFrames, definedValues)[0];
}

export class InterpreterContext {
  constructor (context) {
    this.fieldName = context.fieldName;
    this.thisKf = context.thisKf;
    this.definedFrames = context.definedFrames;
    this.definedValues = context.definedValues;
    this.FPS = context.FPS;
    this.BPM = context.BPM;
    this.variableMap = context.variableMap;
  }
}

export function parse(input) {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(getGrammar()));
    const parsed = parser.feed(input);
    return parsed.results[0][0];
}

// Evaluation of parseq lang
// Returns: a function that takes a frame number and returns a float value
export function interpret(ast, context) {
  console.log("Interpreting: ", ast, context);

  if (typeof ast === 'number') {
    // Node was interpreted down to a constant.
    return _ => ast
  }

  // TODO rewrite in Typescript to avoid this manual type checking nonsense.
  if (typeof context === "undefined"
    || typeof context.fieldName === "undefined"
    || typeof context.thisKf === "undefined"
    || typeof context.definedFrames === "undefined"
    || typeof context.definedValues === "undefined") {
    throw new Error(`Invalid context when interpreting ${ast}: ${context}`);
  }

  // TODO replace this with proper polymorphic evaluatable AST nodes
  switch (ast.type) {
    case 'number_literal':
      return _ => ast.value;
    case 'var_reference':
      switch(ast.var_name.value) {
        case 'L':
          return f => linear_interpolation(context.definedFrames, context.definedValues, f);
        case 'P':
          return f => poly_interpolation(context.definedFrames, context.definedValues, f);
        case 'S':
          return f => getPreviousKeyframeValue(context, f);
        case 'C':
          return f => cubic_spline_interpolation(context.definedFrames, context.definedValues, f);
        case 'f':
          return f => f;
        case 'prev_keyframe':
          return f => getPreviousKeyframe(context, f);
        case 'next_keyframe':
          return f => getNextKeyframe(context, f);
        case 'prev_keyframe_value':
          return f => getPreviousKeyframeValue(context, f);
        case 'next_keyframe_value':
          return f => getNextKeyframeValue(context, f);
        default:
          if (ast.var_name.value in context.variableMap) {
            return _ => context.variableMap[ast.var_name.value];
          } else {
            throw new Error(`Unrecognised variable ${ast.var_name.value} at ${ast.var_name.start.line}:${ast.var_name.start.col}`);
          }
      }
    case 'number_with_unit':
      switch (ast.right.value) {
        case 'f':
          return f => interpret(ast.left, context)(f);
        case 's':
          return f => interpret(ast.left, context)(f) * context.FPS;
        case 'b':
          return f => interpret(ast.left, context)(f) * (context.FPS*60)/context.BPM
        default:
          throw new Error(`Unrecognised conversion unit ${ast.right.value} at ${ast.right.start.line}:${ast.right.start.col}`);
      }
    case 'negation':
      let term = interpret(ast.value, context)
      return f => - term(f);   
    case 'call_expression_named_args':
      switch(ast.fun_name.value) {
        case 'sin': 
        case 'sq':          
        case 'tri':          
        case 'saw':
        case 'pulse':
          let [period, phase, amp, centre, pulse] = get_oscillator_named_arguments(ast.arguments).map(arg => interpret(arg, context));
          return f => oscillator(ast.fun_name.value, period(f), phase(f)+f, amp(f), centre(f), pulse(f));
        case 'min':
          let l1 = interpret(named_argument_extractor(ast.arguments, ['left', 'l'], null), context);
          let r1 = interpret(named_argument_extractor(ast.arguments, ['right', 'r'], null), context);          
          return f => Math.min(l1(f), r1(f)) 
        case 'max':  
          let l2 = interpret(named_argument_extractor(ast.arguments, ['left', 'l'], null), context);          
          let r2 =interpret( named_argument_extractor(ast.arguments, ['right', 'r'], null), context);           
          return f => Math.max(l2(f), r2(f))
        case 'bez':
            let [x1, y1, x2, y2] = get_bezier_named_arguments(ast.arguments).map(arg => interpret(arg, context));
            return f => bezier(f, x1(f), y1(f), x2(f), y2(f), context);          
        case 'abs':  
          let va = interpret(named_argument_extractor(ast.arguments, ['value', 'v'], null), context);          
          return f => Math.abs(va(f))
        // case 'round':  
        //   let vr1 = interpret(named_argument_extractor(ast.arguments, ['value', 'v'], null), context);
        //   let vr2 = interpret(named_argument_extractor(ast.arguments, ['precision', 'p'], null), context);
          // return f => vr1(f).toFixed(vr2(f));
        default:
          throw new Error(`Unrecognised function ${ast.fun_name.value} at ${ast.right.start.line}:${ast.right.start.col}`);
      }
      case 'call_expression':
        switch(ast.fun_name.value) {
          case 'sin': 
          case 'sq':          
          case 'tri':          
          case 'saw':
          case 'pulse':  
            let [period, phase = _ => 0, amp = _ => 1, centre = _ => 0, pulse = _ => 5] = ast.arguments.map(arg => interpret(arg, context));
            return f => oscillator(ast.fun_name.value, period(f), phase(f)+f, amp(f), centre(f), pulse(f))
          case 'min':
            return f => Math.min(interpret(ast.arguments[0], context)(f), interpret(ast.arguments[1], context)(f));
          case 'max':
            return f => Math.max(interpret(ast.arguments[0], context)(f), interpret(ast.arguments[1], context)(f));
          case 'abs':
            return f => Math.abs(interpret(ast.arguments[0], context)(f));
          // case 'round':
          //     return f => interpret(ast.arguments[0], context)(f).toFixed(interpret(ast.arguments[1], context)(f));
          case 'bez':
            let [x1 = _ => 0.5, y1 = _ => 0, x2 = _ => 0.5, y2 = _ => 1] = ast.arguments.map(arg => interpret(arg, context))
            return f => bezier(f, x1(f), y1(f), x2(f), y2(f), context);
          default:
            throw new Error(`Unrecognised function ${ast.fun_name.value} at ${ast.start.line}:${ast.start.col}`);
        }
    case "binary_operation":
      let left = interpret(ast.left, context);
      let right = interpret(ast.right, context);
      switch (ast.operator.value) {
        case '+': return f => left(f)+right(f);
        case '-': return f => left(f)-right(f);
        case '*': return f => left(f)*right(f);
        case '/': return f => left(f)/right(f);
        case '%': return f => left(f)%right(f);
        case '!=': return f => left(f)!=right(f) ? 1 : 0;
        case '==': return f => left(f)==right(f) ? 1 : 0;
        case '<': return f => left(f)<right(f) ? 1 : 0;
        case '<=': return f => left(f)<=right(f) ? 1 : 0;
        case '>=': return f => left(f)>=right(f) ? 1 : 0;
        case '>': return f => left(f)>right(f) ? 1 : 0;
        case 'and': return f => left(f) && right(f) ? 1 : 0;
        case 'or': return f => left(f) || right(f) ? 1 : 0;
        default: throw new Error(`Unrecognised operator ${ast.operator.value} at ${ast.operator.start.line}:${ast.operator.start.col}`);
      }
    case "if_expression":
      let condition = interpret(ast.condition, context);
      let consequent = interpret(ast.consequent, context);
      let alternate = ast.alternate ? interpret(ast.alternate, context) : f => 0;
      return f => (condition(f)>0) ? consequent(f) : alternate(f)
    default:
      throw new Error(`Unrecognised expression ${ast.type} at ${ast.start.line}:${ast.start.col}`);
  }
}

function getPreviousKeyframe(context, f) {
  let idx = context.definedFrames.findLastIndex(v => v <= f);
  return idx != -1 ? context.definedFrames[idx] : context.definedFrames.at(0);
}

function getNextKeyframe(context, f) {
  let idx = context.definedFrames.findIndex(v => v > f);
  return idx != -1 ? context.definedFrames[idx] : context.definedFrames.at(-1);
}

function getPreviousKeyframeValue(context, f) {
  let idx = context.definedFrames.findLastIndex(v => v <= f);
  return idx != -1 ? context.definedValues[idx] : context.definedValues.at(0);
}

function getNextKeyframeValue(context, f) {
  let idx = context.definedFrames.findIndex(v => v > f);
  return idx != -1 ? context.definedValues[idx] : context.definedValues.at(-1);
}

function oscillator(osc, period, pos, amp, centre, pulsewidth) {
  switch(osc) {
    case 'sin': return centre + Math.sin(pos * Math.PI * 2 / period) * amp;
    case 'tri': return centre + Math.asin(Math.sin(pos * Math.PI * 2 / period)) * (2 * amp) / Math.PI;
    case 'saw': return centre + (pos % period) * amp / period
    case 'sq':  return centre + (Math.sin(pos * Math.PI * 2 / period) >= 0 ? 1 : -1) * amp;    
    case 'pulse':  return centre + amp *((pos%period) < pulsewidth ? 1 : 0);
    default:  throw new Error(`Unrecognised oscillator ${osc}`);
  }
  
} 

function bezier(f, x1, y1, x2, y2, context) {
  let bezier = BezierEasing(x1, y1, x2, y2);
  let start_x = getPreviousKeyframe(context, f);
  let range_x = getNextKeyframe(context, f) - getPreviousKeyframe(context, f);
  let start_y = getPreviousKeyframeValue(context, f);
  let range_y = getNextKeyframeValue(context, f) - getPreviousKeyframeValue(context, f);
  return start_y + bezier((f-start_x) / range_x) * range_y;
}

function named_argument_extractor(args, argNames, defaultValue) {
    let matchingArgs = args.filter( arg => argNames.includes(arg.name.value));
    if (matchingArgs.length === 0) {
      if (defaultValue != null) {
        return defaultValue;
      } else {
        throw new Error(`Mandatory argument missing: ${argNames.join(' or ')}`);
      }
    } else if (matchingArgs.length > 1) {
      throw new Error(`Cannot have multiple arguments called: ${argNames}`);
    } else {
      return matchingArgs[0].value;
    }  
  }

function get_oscillator_named_arguments(args) {
  return [
    named_argument_extractor(args, ['period', 'p'], null),
    named_argument_extractor(args, ['phase', 'ps'],  0),
    named_argument_extractor(args, ['amp', 'a'],  1),
    named_argument_extractor(args, ['centre', 'c'], 0),
    named_argument_extractor(args, ['pulsewidth', 'pulse', 'pw'], 5)
  ]
}

function get_bezier_named_arguments(args) {
  return [
    named_argument_extractor(args, ['x1'], 0.5),
    named_argument_extractor(args, ['y1'],  0),
    named_argument_extractor(args, ['x2'],  0.5),
    named_argument_extractor(args, ['y2'], 1),
  ]
}

