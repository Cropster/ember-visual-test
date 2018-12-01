import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import setupVisualTests from 'ember-visual-test/test-support/setup';

setApplication(Application.create(config.APP));

setupVisualTests();
start();
