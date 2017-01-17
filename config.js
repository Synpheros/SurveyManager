/*
 * Copyright 2016 e-UCM (http://www.e-ucm.es/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * This project has received funding from the European Union’s Horizon
 * 2020 research and innovation programme under grant agreement No 644187.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0 (link is external)
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

exports.port = process.env.PORT || '4000';
exports.apiPath = 'http://localhost:4000/api';
exports.companyName = 'e-UCM Research Group';
exports.projectName = 'Survey Manager';
exports.myHost = 'localhost';
exports.a2 = {
    a2ApiPath: 'http://localhost:3000/api/',
    a2Prefix: 'surveymanager',
    a2HomePage: 'http://localhost:3000/',
    a2AdminUsername: 'root',
    a2AdminPassword: 'root'
};
exports.mongodb = {
    uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/limesurveymanager'
};
exports.limesurveyUrl = 'http://localhost:80/';