//@ts-ignore
import { InvocationContext, ParseqAstNode } from './parseq-lang-ast';
import { parse } from './parseq-lang-parser';

const basicContext : InvocationContext =  {
  definedFrames: [0,5,10],
  definedValues: [5,0,10],
  fieldName: 'test',
  BPM: 140,
  FPS: 30,
  allKeyframes: [],
  variableMap: new Map(),
  activeKeyframe: 0,
  frame: 0
};

const runParseq = (formula: string) => {
  var activeKeyframe = 0;
  return [ ...Array(11).keys() ].map((i, f) => 
    {
      activeKeyframe = basicContext.definedFrames.includes(i) ? i : activeKeyframe;
      const parsed = parse(formula) as ParseqAstNode;

      return parsed.invoke({...basicContext, activeKeyframe, frame: f })
    });
}

const runTest = (label:string, formula: string, expected: (number|string)[]) => {
  const testTag = label + ': ' + formula;
  //  eslint-disable-next-line jest/valid-title
  test(testTag, () => {
    const results = runParseq(formula);
    expect(JSON.stringify(results))
      .toEqual(JSON.stringify(expected));
  });
}

runTest('tri-named-args', 'round(tri(p=5, ps=1, a=2, c=10, li=0.5),2)', [11.6,10.8,9.2,0,0,11.6,10.8,9.2,0,0,11.6]); // fractional limit
runTest('tri-named-args', 'round(tri(p=5, ps=1, a=2, c=10, li=0.5, pw=99),2)', [11.6,10.8,9.2,0,0,11.6,10.8,9.2,0,0,11.6]);  //pulse should be ignored

runTest('saw-named-args', 'round(saw(p=10),2)', [0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0]);
runTest('saw-named-args', 'round(saw(p=10, ps=1),2)', [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0,0.1]);  //phase shift
runTest('saw-named-args', 'round(saw(p=10, ps=1, a=2),2)', [0.2,0.4,0.6,0.8,1,1.2,1.4,1.6,1.8,0,0.2]); //amplitude
runTest('saw-named-args', 'round(saw(p=10, ps=1, a=2, c=10),2)', [10.2,10.4,10.6,10.8,11,11.2,11.4,11.6,11.8,10,10.2]); //centre
runTest('saw-named-args', 'round(saw(p=5, ps=1, a=2, c=10, li=0.5),2)', [10.4,10.8,11.2,0,0,10.4,10.8,11.2,0,0,10.4]); // fractional limit
runTest('saw-named-args', 'round(saw(p=5, ps=1, a=2, c=10, li=0.5, pw=99),2)', [10.4,10.8,11.2,0,0,10.4,10.8,11.2,0,0,10.4]);  //pulse should be ignored

runTest('pulse-named-args', 'round(pulse(p=10),2)', [1,1,1,1,1,0,0,0,0,0,1]);
runTest('pulse-named-args', 'round(pulse(p=10, ps=1),2)', [1,1,1,1,0,0,0,0,0,1,1]);  //phase shift
runTest('pulse-named-args', 'round(pulse(p=10, ps=1, a=2),2)', [2,2,2,2,0,0,0,0,0,2,2]); //amplitude
runTest('pulse-named-args', 'round(pulse(p=10, ps=1, a=2, c=10),2)', [12,12,12,12,10,10,10,10,10,12,12]); //centre
runTest('pulse-named-args', 'round(pulse(p=5, ps=0, a=2, c=10, li=0.5, pw=1),2)', [12,10,10,0,0,12,10,10,0,0,12]); // limit
runTest('pulse-named-args', 'round(pulse(p=5, ps=0, a=2, c=10, li=0, pw=2),2)', [12,12,10,10,10,12,12,10,10,10,12]);  //pulse width

runTest('addition', '1+1', [2,2,2,2,2,2,2,2,2,2,2]);

runTest('condtional', 'if (1 ) 2', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('condtional', 'if (0 ) 2', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('condtional', 'if (0) 2 else 3', [3,3,3,3,3,3,3,3,3,3,3]);
runTest('condtional', 'if (0) 2 else if (1) 3 else 4', [3,3,3,3,3,3,3,3,3,3,3]);
runTest('condtional', 'if (0) 2 else if (0) 3 else 4', [4,4,4,4,4,4,4,4,4,4,4]);
runTest('condtional', 'if (0 or 1) 2', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('condtional', 'if (0 and 1) 2', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('condtional', 'if (0 or 1 ) 2', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('condtional', 'if ( 0 or 1) 2', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('condtional', 'if ( 0 or 1 ) 2', [2,2,2,2,2,2,2,2,2,2,2]);

runTest('precedence', '1+1*5', [6,6,6,6,6,6,6,6,6,6,6]);
runTest('precedence', '5*1+1', [6,6,6,6,6,6,6,6,6,6,6]);
runTest('precedence', '(1+1)*5', [10,10,10,10,10,10,10,10,10,10,10]);
runTest('precedence', '5*(1+1)', [10,10,10,10,10,10,10,10,10,10,10]);

runTest('round', 'round(1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(1.4)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(1.5)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('round', 'round(1,2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(1.444,2)', [1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44]);
runTest('round', 'round(1.555,2)', [1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56]);
runTest('round', 'round(v=1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(v=1.4)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(v=1.5)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('round', 'round(v=1,p=2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('round', 'round(v=1.444,p=2)', [1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44]);
runTest('round', 'round(v=1.555,p=2)', [1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56]);

runTest('ceil', 'ceil(1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('ceil', 'ceil(1.4)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('ceil', 'ceil(1.5)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('ceil', 'ceil(1,2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('ceil', 'ceil(1.444,2)', [1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45]);
runTest('ceil', 'ceil(1.555,2)', [1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56]);
runTest('ceil', 'ceil(v=1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('ceil', 'ceil(v=1.4)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('ceil', 'ceil(v=1.5)', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('ceil', 'ceil(v=1,p=2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('ceil', 'ceil(v=1.444,p=2)', [1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45,1.45]);
runTest('ceil', 'ceil(v=1.555,p=2)', [1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56,1.56]);

runTest('floor', 'floor(1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(1.4)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(1.5)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(1,2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(1.444,2)', [1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44]);
runTest('floor', 'floor(1.555,2)', [1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55]);
runTest('floor', 'floor(v=1)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(v=1.4)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(v=1.5)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(v=1,p=2)', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('floor', 'floor(v=1.444,p=2)', [1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44,1.44]);
runTest('floor', 'floor(v=1.555,p=2)', [1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55,1.55]);


runTest('binary-ops', '1+2', [3,3,3,3,3,3,3,3,3,3,3]);
runTest('binary-ops', '"a"+2', ["a2","a2","a2","a2","a2","a2","a2","a2","a2","a2","a2"]);
runTest('binary-ops', '3+"b"', ["3b","3b","3b","3b","3b","3b","3b","3b","3b","3b","3b"]);
runTest('binary-ops', '1-2', [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]);
runTest('binary-ops', '"a"-2', [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN]);
runTest('binary-ops', '2*2', [4,4,4,4,4,4,4,4,4,4,4]);
runTest('binary-ops', '"a"*2', [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN]);
runTest('binary-ops', '6/3', [2,2,2,2,2,2,2,2,2,2,2]);
runTest('binary-ops', '"a"/3', [NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN,NaN]);
runTest('binary-ops', '5%2', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '5^4', [625,625,625,625,625,625,625,625,625,625,625]);
runTest('binary-ops', '5==5', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '4==5', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"=="a"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"a"=="b"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"2"==2', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '5!=5', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '4!=5', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"a"!="a"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"!="b"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"2"!=2', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', '3<4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '4<4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '5<4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"<4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"<"b"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"b"<"b"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"c"<"b"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', '3<=4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '4<=4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '5<=4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"<=4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a"<="b"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"b"<="b"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"c"<="b"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', '3>=4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '4>=4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '5>=4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"a">=4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a">="b"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"b">="b"', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"c">="b"', [1,1,1,1,1,1,1,1,1,1,1]);

runTest('binary-ops', '3>4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '4>4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '5>4', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"a">4', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a">"b"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"b">"b"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"c">"b"', [1,1,1,1,1,1,1,1,1,1,1]);

runTest('binary-ops', 'false and false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'false and true', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'true and false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'true and true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '0 and 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '0 and 1', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '1 and 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '1 and 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"" and ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"" and "a"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" and ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" and "a"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', 'false && false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'false && true', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'true && false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'true && true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '0 && 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '0 && 1', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '1 && 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '1 && 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"" && ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"" && "a"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" && ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" && "a"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', 'false or false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'false or true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', 'true or false', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', 'true or true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '0 or 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '0 or 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '1 or 0', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '1 or 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"" or ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"" or "a"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" or ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" or "a"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', 'false || false', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', 'false || true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', 'true || false', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', 'true || true', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '0 || 0', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '0 || 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '1 || 0', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '1 || 1', [1,1,1,1,1,1,1,1,1,1,1]);
runTest('binary-ops', '"" || ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"" || "a"', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" || ""', [0,0,0,0,0,0,0,0,0,0,0]);
runTest('binary-ops', '"a" || "a"', [0,0,0,0,0,0,0,0,0,0,0]);

runTest('binary-ops', '"cat" : 0.5', ["(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)","(cat:0.5)",]);

runTest('bez', 'round(bez(), 2)', [5,4.68,3.46,1.54,0.32,0,0.64,3.09,6.91,9.36,10]);
runTest('bez', 'round(bez(0.1), 2)', [5,3.64,2.15,0.99,0.26,0,2.71,5.69,8.01,9.49,10]);
runTest('bez', 'round(bez(0.1,0.9), 2)', [5,1.65,0.64,0.2,0.04,0,6.71,8.73,9.59,9.93,10]);
runTest('bez', 'round(bez(0.1,0.9,0.9), 2)', [5,2.21,1.16,0.54,0.17,0,5.59,7.68,8.92,9.66,10]);
runTest('bez', 'round(bez(0.1,0.9,0.9,-0.5), 2)', [5,3.36,3.5,3.7,3.39,0,3.28,3,2.6,3.23,10]);

runTest('bez', 'round(bez(from=-10), 2)', [-10,-9.36,-6.91,-3.09,-0.64,-10,-8.71,-3.82,3.82,8.71,-10]);
runTest('bez', 'round(bez(to=-10), 2)', [5,4.03,0.37,-5.37,-9.03,0,-0.64,-3.09,-6.91,-9.36,10]);
runTest('bez', 'round(bez(span=3), 2)', [5,3.98,1.02,0,0,0,2.04,7.96,10,10,10]);
runTest('bez', 'round(bez(from=-10, to=10, span=3), 2)', [-10,-5.93,5.93,10,10,-10,-5.93,5.93,10,10,-10]);

runTest('slide', 'slide()', [5,4,3,2,1,0,2,4,6,8,10]);
runTest('slide', 'slide(from=-10)', [-10,-8,-6,-4,-2,-10,-6,-2,2,6,-10]);
runTest('slide', 'slide(to=-10)', [5,2,-1,-4,-7,0,-2,-4,-6,-8,10]);
runTest('slide', 'slide(to=-10, span=3)', [5,0,-5,-10,-10,0,-3.3333333333333335,-6.666666666666667,-10,-10,10]);
runTest('slide', 'slide(from=-10, to=10, span=3)', [-10,-3.333333333333333,3.333333333333334,10,10,-10,-3.333333333333333,3.333333333333334,10,10,-10]);

//TODO - these have no tests
//runTest('info_match', 'info_match()', [0,0,0,0,0,0,0,0,0,0,0]);
//runTest('info_match_count', 'info_match_count()', [0,0,0,0,0,0,0,0,0,0,0]);
//runTest('info_match_last', 'info_match_last()', [0,0,0,0,0,0,0,0,0,0,0]);
//
// Error cases:
// 