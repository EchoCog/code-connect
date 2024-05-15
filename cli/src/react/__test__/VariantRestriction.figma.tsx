import React from 'react'
import figma from '../..'
import { Button } from './TestComponents'

figma.connect(Button, 'ui/button', {
  example: () => <Button>Click me</Button>,
})
figma.connect(Button, 'ui/button', {
  variant: { HasIcon: true },
  example: () => <Button icon="some-icon-32">Click me</Button>,
})
