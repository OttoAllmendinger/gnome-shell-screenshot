import ExtensionUtils from '../gselib/extensionUtils';
import { enable, disable } from './extension';

export default function init() {
  ExtensionUtils.initTranslations();

  return { enable, disable };
}
