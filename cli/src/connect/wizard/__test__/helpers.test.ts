import path from 'path'
import {
  DEFAULT_INCLUDE_GLOBS_BY_PARSER,
  ProjectInfo,
  ReactProjectInfo,
  getProjectInfo,
  getReactProjectInfo,
} from '../../project'
import { getIncludesGlob, getComponentOptionsMap, getFilepathExportsFromFiles } from '../helpers'

describe('getIncludesGlob', () => {
  it('returns default includes glob if no component directory', () => {
    const result = getIncludesGlob({
      dir: './',
      componentDirectory: null,
      config: {
        parser: 'react',
      },
    })
    expect(result).toBe(DEFAULT_INCLUDE_GLOBS_BY_PARSER.react)
  })

  it('prepends path to component directory to default globs', () => {
    const result = getIncludesGlob({
      dir: './',
      componentDirectory: './src/connect/wizard/__test__',
      config: {
        parser: 'react',
      },
    })
    expect(result).toEqual(['src/connect/wizard/__test__/**/*.{tsx,jsx}'])
  })
})

describe('getComponentOptionsMap', () => {
  it('generates map of file paths to component Choice objects', () => {
    const result = getComponentOptionsMap([
      '/some/file.tsx~default',
      '/some/file.tsx~MyComponent',
      '/another/file.tsx~Component1',
      '/another/file.tsx~Component2',
      '/another/file.tsx~Component3',
      '/last_one.tsx~default',
    ])
    expect(result).toEqual({
      '/some/file.tsx': [
        {
          title: 'default',
          value: '/some/file.tsx~default',
        },
        {
          title: 'MyComponent',
          value: '/some/file.tsx~MyComponent',
        },
      ],
      '/another/file.tsx': [
        {
          title: 'Component1',
          value: '/another/file.tsx~Component1',
        },
        {
          title: 'Component2',
          value: '/another/file.tsx~Component2',
        },
        {
          title: 'Component3',
          value: '/another/file.tsx~Component3',
        },
      ],
      '/last_one.tsx': [
        {
          title: 'default',
          value: '/last_one.tsx~default',
        },
      ],
    })
  })
})

describe('getFilepathExportsFromFiles', () => {
  let projectInfo: ProjectInfo
  beforeEach(async () => {
    projectInfo = await getProjectInfo(path.join(__dirname, 'tsProgram', 'react'), '').then((res) =>
      getReactProjectInfo(res as ReactProjectInfo),
    )
  })

  it('generates list of file component keys from ProjectInfo', () => {
    const result = getFilepathExportsFromFiles(projectInfo)
    expect(result.map((filepath) => path.parse(filepath).base)).toEqual([
      'MyComponent.tsx~MyComponent',
      'MyComponent.tsx~MyComponentProps', // TODO ideally we'd filter out by type here
      'MultipleComponents.tsx~default',
      'MultipleComponents.tsx~AnotherComponent1',
      'MultipleComponents.tsx~AnotherComponent2',
    ])
  })
})
