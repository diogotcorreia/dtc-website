import { makeStyles } from '@material-ui/styles';
import dayjs from 'dayjs';
import React from 'react';

const useStyles = makeStyles({
  root: {
    '& ul': {
      listStyleType: 'disc',
      marginTop: 5,
      '& li': {
        marginBottom: 5,
      },
    },
  },
});

const Goal = ({ goal }) => {
  var classes = useStyles();
  var edits = goal.edits || [];
  var lastEdit = edits[edits.length - 1];
  var subgoals = goal.subgoals || [];
  switch (goal.type) {
    // Sports (with best time)
    case 0:
      return (
        <li className={classes.root}>
          {lastEdit ? (
            <>
              <s>{goal.name}</s>
              {` — Best time: `}
              <strong>{convertTime(lastEdit.value)}s</strong>
              {` on `}
              {formatDate(lastEdit.date)}
              {/* For runs with Strava links*/}
              {lastEdit.link && (
                <>
                  {` (Check on `}
                  <a href={lastEdit.link} target='_blank' rel='noopener noreferrer'>
                    Strava
                  </a>
                  {`)`}
                </>
              )}
              {/* For triathlons with Strava links*/}
              {lastEdit.links && (
                <>
                  {` — `}
                  <a href={lastEdit.links[0]} target='_blank' rel='noopener noreferrer'>
                    Swimming Segment
                  </a>
                  {` | `}
                  <a href={lastEdit.links[1]} target='_blank' rel='noopener noreferrer'>
                    Cycling Segment
                  </a>
                  {` | `}
                  <a href={lastEdit.links[2]} target='_blank' rel='noopener noreferrer'>
                    Running Segment
                  </a>
                </>
              )}
            </>
          ) : (
            goal.name
          )}
          {subgoals.length > 0 && (
            <ul>
              {subgoals.map((subgoal) => (
                <SubGoal key={subgoal} value={subgoal} edits={edits} />
              ))}
            </ul>
          )}
        </li>
      );
    // Simple done or not done
    case 1:
    // Simple done or not done (with custom date)
    // eslint-disable-next-line
    case 2:
      return (
        <li>
          {lastEdit ? (
            <>
              <s>{goal.name}</s>
              {` (`}
              <strong>{goal.type === 1 ? formatDate(lastEdit.date) : lastEdit.date}</strong>
              {`)`}
            </>
          ) : (
            goal.name
          )}
        </li>
      );
    default:
      return <li>Error: Unknown type</li>;
  }
};

const SubGoal = ({ value, edits }) => {
  var matchingEdit = edits.find((edit) => edit.value <= value);
  return (
    <li>
      {matchingEdit ? (
        <>
          <s>≤ {convertTime(value)}s</s>
          {` — Accomplished on `}
          {formatDate(matchingEdit.date)}
          {` with a time of `}
          <strong>{convertTime(matchingEdit.value)}s</strong>
          {/* For runs with Strava links*/}
          {matchingEdit.link && (
            <>
              {` (Check on `}
              <a href={matchingEdit.link} target='_blank' rel='noopener noreferrer'>
                Strava
              </a>
              {`)`}
            </>
          )}
          {/* For triathlons with Strava links*/}
          {matchingEdit.links && (
            <>
              {` — `}
              <a href={matchingEdit.links[0]} target='_blank' rel='noopener noreferrer'>
                Swimming Segment
              </a>
              {` | `}
              <a href={matchingEdit.links[1]} target='_blank' rel='noopener noreferrer'>
                Cycling Segment
              </a>
              {` | `}
              <a href={matchingEdit.links[2]} target='_blank' rel='noopener noreferrer'>
                Running Segment
              </a>
            </>
          )}
        </>
      ) : (
        `≤ ${convertTime(value)}s`
      )}
    </li>
  );
};

const convertTime = (value) => {
  var hrs = ~~(value / 3600);
  var mins = ~~((value % 3600) / 60);
  var secs = +(value % 60).toFixed(2);

  var ret = '';

  if (hrs > 0) ret += (hrs < 10 ? '0' : '') + hrs + ':';
  if (mins > 0) ret += (mins < 10 ? '0' : '') + mins + "'";
  ret += (secs < 10 ? '0' : '') + secs;
  return ret;
};

const formatDate = (date) => {
  var d = dayjs(date);
  return (
    <span>
      {d.date()}
      <sup>{nth(d.date())}</sup>
      {d.format(' MMMM YYYY')}
    </span>
  );
};

const nth = (d) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

export default Goal;
