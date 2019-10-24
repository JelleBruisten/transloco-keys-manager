import { readFile } from '../helpers/readFile';
import { regexs } from '../regexs';
import { ExtractorConfig, ScopeMap, Scopes } from '../types';
import { forEachKey } from './forEachKey';
import { resolveScopeAlias } from './resolveScopeAlias';
import { addKey } from './addKey';
import {extractCommentsValues} from "./commentsSectionExtractor";
import {resolveAliasAndKey} from "./resolveAliasAndKey";

export function TSExtractor({ file, scopes, defaultValue, scopeToKeys }: ExtractorConfig): ScopeMap {
  const content = readFile(file);
  if (!content.includes('@ngneat/transloco')) return scopeToKeys;

  const serviceMethod = regexs.serviceInjection.exec(content);
  let regex: RegExp;

  if (serviceMethod) {
    regex = regexs.translationCalls(serviceMethod.groups.serviceName);
  } else {
    const translateFunction = regexs.directImport.exec(content);
    if (translateFunction) {
      regex = regexs.translationCalls();
    }
  }

  if (regex) {
    forEachKey(content, regex, (translationKey, scopePath) => {
      const [key, scopeAlias] = resolveAliasAndKeyFromService(translationKey, scopePath, scopes);
      addKey({
        defaultValue,
        scopeAlias,
        keyWithoutScope: key,
        scopeToKeys,
        scopes
      });
    });
  }

  /** Check for dynamic markings */
  extractCommentsValues({
    content,
    regex: regexs.tsCommentsSection(),
    scopes,
    defaultValue,
    scopeToKeys
  });

  return scopeToKeys;
}

/**
 *
 * It can be one of the following:
 *
 * translate('2', {}, 'some/nested');
 * translate('3', {}, 'some/nested/en');
 * translate('globalKey');
 *
 */
function resolveAliasAndKeyFromService(key: string, scopePath: string, scopes: Scopes): [string, string] {
  // It means that is the global
  if (!scopePath) {
    return [key, null];
  }

  const scopeAlias = resolveScopeAlias({ scopePath, scopes });
  return [key, scopeAlias];
}
