/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const Runner = require('../../runner.js');
const {collectArtifactDependencies} = require('./runner-helpers.js');
const {initializeConfig} = require('../config/config.js');
const {getBaseArtifacts} = require('./base-artifacts.js');

/** @param {{page: import('puppeteer').Page, config?: LH.Config.Json}} options */
async function snapshot(options) {
  const {config} = initializeConfig(options.config, {gatherMode: 'snapshot'});
  const driver = new Driver(options.page);
  await driver.connect();

  const url = await options.page.url();

  const baseArtifacts = await getBaseArtifacts(config, driver);
  baseArtifacts.URL.requestedUrl = url;
  baseArtifacts.URL.finalUrl = url;

  /** @type {Partial<LH.GathererArtifacts>} */
  const gathererArtifacts = {};

  for (const artifactDefn of config.artifacts || []) {
    const {id, gatherer} = artifactDefn;
    const artifactName = /** @type {keyof LH.GathererArtifacts} */ (id);
    const dependencies = await collectArtifactDependencies(artifactDefn, gathererArtifacts);
    /** @type {LH.Gatherer.FRTransitionalContext} */
    const context = {
      gatherMode: 'snapshot',
      url,
      driver,
      dependencies,
    };
    const artifact = await Promise.resolve()
      .then(() => gatherer.instance.snapshot(context))
      .catch(err => err);

    gathererArtifacts[artifactName] = artifact;
  }

  const artifacts = /** @type {LH.Artifacts} */ ({...baseArtifacts, ...gathererArtifacts}); // Cast to drop Partial<>

  return Runner.run(artifacts, {config});
}

module.exports = {
  snapshot,
};
