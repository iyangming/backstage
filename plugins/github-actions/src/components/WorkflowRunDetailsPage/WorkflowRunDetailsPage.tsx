/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Button,
  LinearProgress,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Theme,
  Typography,
  Box,
  ExpansionPanelDetails,
  ExpansionPanel,
  ExpansionPanelSummary,
  ListItem,
  List,
  ListItemText,
} from '@material-ui/core';
import moment from 'moment';

import React from 'react';
import { useParams } from 'react-router-dom';
import { useAsync } from 'react-use';
import { Link, useApi, githubAuthApiRef } from '@backstage/core';
import { githubActionsApiRef } from '../../api';
import { Job, Step, Jobs } from '../types';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { WorkflowRunStatusIndicator } from '../WorkflowRunStatusIndicator';

const useStyles = makeStyles<Theme>(theme => ({
  root: {
    maxWidth: 720,
    margin: theme.spacing(2),
  },
  title: {
    padding: theme.spacing(1, 0, 2, 0),
  },
  table: {
    padding: theme.spacing(1),
  },
  expansionPanelDetails: {
    padding: 0,
  },
  button: {
    order: -1,
    marginRight: 0,
    marginLeft: '-20px',
  },
}));

const JobsList = ({ jobs }: { jobs?: Jobs }) => {
  const classes = useStyles();
  return (
    <Box>
      {jobs &&
        jobs.total_count > 0 &&
        jobs.jobs.map((job: Job) => (
          <JobListItem
            job={job}
            className={
              job.status !== 'success' ? classes.failed : classes.success
            }
          />
        ))}
    </Box>
  );
};

const getElapsedTime = (start: string, end: string) => {
  const diff = moment(moment(end || moment()).diff(moment(start)));
  const timeElapsed = diff.format('m [minutes] s [seconds]');
  return timeElapsed;
};

const StepView = ({ step }: { step: Step }) => {
  return (
    <ListItem>
      <ListItemText
        primary={step.name}
        secondary={getElapsedTime(step.started_at, step.completed_at)}
      />
    </ListItem>
  );
};

const JobListItem = ({ job, className }: { job: Job; className: string }) => {
  const classes = useStyles();
  return (
    <ExpansionPanel
      TransitionProps={{ unmountOnExit: true }}
      className={className}
    >
      <ExpansionPanelSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${name}-content`}
        id={`panel-${name}-header`}
        IconButtonProps={{
          className: classes.button,
        }}
      >
        <Typography variant="button">
          {job.name} ({getElapsedTime(job.started_at, job.completed_at)})
        </Typography>
      </ExpansionPanelSummary>
      <ExpansionPanelDetails className={classes.expansionPanelDetails}>
        <List>
          {job.steps.map((step: Step) => (
            <StepView step={step} />
          ))}
        </List>
      </ExpansionPanelDetails>
    </ExpansionPanel>
  );
};

/**
 * A component for Jobs visualization. Jobs are a property of a Workflow Run.
 */
export const WorkflowRunDetailsPage = () => {
  const repo = 'try-ssr';
  const owner = 'CircleCITest3';
  const api = useApi(githubActionsApiRef);
  const auth = useApi(githubAuthApiRef);

  const classes = useStyles();
  const { id } = useParams();
  const status = useAsync(async () => {
    const token = await auth.getAccessToken(['repo', 'user']);
    return api.getWorkflowRun({
      token,
      owner,
      repo,
      id: parseInt(id, 10),
    });
  }, [location.search]);

  const details = status.value;

  const jobs = useAsync<Jobs>(async () => {
    if (details === undefined) return [];
    const data = await fetch(details.jobs_url).then(d => d.json());
    return data;
  }, [details]);

  if (status.loading) {
    return <LinearProgress />;
  } else if (status.error) {
    return (
      <Typography variant="h6" color="error">
        Failed to load build, {status.error.message}
      </Typography>
    );
  }

  return (
    <div className={classes.root}>
      <Typography className={classes.title} variant="h3">
        <Link to="/github-actions">
          <Typography component="span" variant="h3" color="primary">
            &lt;
          </Typography>
        </Link>
        Workflow Run Details
      </Typography>
      <TableContainer component={Paper} className={classes.table}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography noWrap>Branch</Typography>
              </TableCell>
              <TableCell>{details?.head_branch}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography noWrap>Message</Typography>
              </TableCell>
              <TableCell>{details?.head_commit.message}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography noWrap>Commit ID</Typography>
              </TableCell>
              <TableCell>{details?.head_commit.id}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography noWrap>Status</Typography>
              </TableCell>
              <TableCell>
                <WorkflowRunStatusIndicator status={details?.status} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography noWrap>Author</Typography>
              </TableCell>
              <TableCell>{`${details?.head_commit.author.name} (${details?.head_commit.author.email})`}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography noWrap>Links</Typography>
              </TableCell>
              <TableCell>
                {details?.html_url && (
                  <Button>
                    <a href={details.html_url}>GitHub</a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2}>
                <Typography noWrap>Jobs</Typography>
                <JobsList jobs={jobs.value} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
