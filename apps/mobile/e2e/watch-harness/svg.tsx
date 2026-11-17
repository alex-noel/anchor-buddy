import React from 'react';
const element =
  (tag: string) =>
  ({ children, ...props }: any) =>
    React.createElement(tag, props, children);
export default element('svg');
export const Circle = element('circle');
export const Line = element('line');
export const Text = element('text');
