import * as prettier from 'prettier'
import fs from 'fs'
import {
  CodeConnectConfig,
  DEFAULT_INCLUDE_GLOBS_BY_PARSER,
  ProjectInfo,
  ReactProjectInfo,
  getDefaultConfigPath,
} from '../project'
import { logger, success } from '../../common/logging'
import path from 'path'
import prompts, { Choice } from 'prompts'
import { isFigmaConnectFile } from '../../react/parser'


/**
 *
 * Gets the default include globs for config.parser with componentDirectory prepended
 * @param args
 * @param args.dir project root path
 * @param args.componentDirectory optional path to where includes should be limited to
 * @param args.config CodeConnectConfig
 * @returns array of include globs
 */
export function getIncludesGlob({
  dir,
  componentDirectory,
  config,
}: {
  dir: string
  componentDirectory: string | null
  config: CodeConnectConfig
}) {
  if (componentDirectory) {
    // use unix separators for config file globs
    const pathToComponentsDir = path.relative(dir, componentDirectory).replaceAll(path.sep, '/')
    return DEFAULT_INCLUDE_GLOBS_BY_PARSER[config.parser].map(
      (defaultIncludeGlob) => `${pathToComponentsDir}/${defaultIncludeGlob}`,
    )
  }
  return DEFAULT_INCLUDE_GLOBS_BY_PARSER[config.parser]
}

export async function createCodeConnectConfig({
  dir,
  componentDirectory,
  config,
}: {
  dir: string
  componentDirectory: string | null
  config: CodeConnectConfig
}) {
  const includesGlob = getIncludesGlob({ dir, componentDirectory, config })
  const configJson = `
{
  "codeConnect": {
    "include": ["${includesGlob}"]
  }
}
  `
  const formatted = await prettier.format(configJson, {
    parser: 'json',
  })
  const filePath = getDefaultConfigPath(dir)

  fs.writeFileSync(filePath, formatted)

  logger.info(success(`Created ${filePath}`))
}

const FILEPATH_EXPORT_DELIMITER = '~'

export function parseFilepathExport(filepathExport: string) {
  const delimiterLastIndex = filepathExport.lastIndexOf(FILEPATH_EXPORT_DELIMITER)

  if (delimiterLastIndex === -1) {
    return {
      filepath: filepathExport,
      exportName: null,
    }
  }
  return {
    filepath: filepathExport.substring(0, delimiterLastIndex),
    exportName: filepathExport.substring(delimiterLastIndex + 1),
  }
}

function getFilepathExport(filepath: string, exp: string) {
  return `${filepath}${FILEPATH_EXPORT_DELIMITER}${exp}`
}

/**
 * Formats an array of filepathExports into a map of filepaths->exports
 *
 * @param filepathExports an array of components in the format `${filepath}~${componentName}
 * @returns a map of filepaths to an array of their exports. Array is empty if no exports found
 */
export function getComponentOptionsMap(filepathExports: string[]) {
  return filepathExports.reduce(
    (acc, filepathExport) => {
      const { filepath, exportName } = parseFilepathExport(filepathExport)
      acc[filepath] = acc[filepath] || []
      if (exportName) {
        acc[filepath].push({
          title: exportName,
          value: getFilepathExport(filepath, exportName),
        })
      }
      return acc
    },
    {} as Record<string, Choice[]>,
  )
}

/**
 * Parses a ProjectInfo for any TS exports (or filepaths if not a TS project)
 *
 * @param projectInfo
 * @returns an array of components in the format `${filepath}~${componentName}
 */
export function getFilepathExportsFromFiles(projectInfo: ProjectInfo) {
  return projectInfo.files.reduce((options, filepath) => {
    if (projectInfo.config.parser === 'react') {
      const { tsProgram } = projectInfo as ReactProjectInfo
      if (!isFigmaConnectFile(tsProgram, filepath)) {
        const checker = tsProgram.getTypeChecker()
        const sourceFile = tsProgram.getSourceFile(filepath)
        if (!sourceFile) {
          throw new Error(`Could not parse file ${filepath}`)
        }
        const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile)!
        const exports = checker.getExportsOfModule(sourceFileSymbol)

        exports.forEach((exp) => {
          options.push(getFilepathExport(filepath, exp.getName()))
        })
      }
    } else {
      options.push(filepath)
    }
    return options
  }, [] as string[])
}
