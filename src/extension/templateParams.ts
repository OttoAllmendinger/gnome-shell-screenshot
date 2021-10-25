import { _ } from '../gselib/extensionUtils';

export type TemplateParam = [string, string, string];

export function toTooltipText(parameters: TemplateParam[], caption = _('Parameters:')): string {
  return parameters
    .reduce(
      (arr: string[], [key, _value, description]) => {
        arr.push(key + '\t' + description);
        return arr;
      },
      [caption],
    )
    .join('\n');
}

export function toObject(parameters: TemplateParam[]): Record<string, string> {
  return parameters.reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {});
}
