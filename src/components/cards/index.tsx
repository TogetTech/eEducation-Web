import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {observer} from 'mobx-react';
import { Box, createStyles, Grid, Switch, SwitchProps, Theme, withStyles } from '@material-ui/core';
import { t } from '@/i18n';
import { useExtensionStore } from '@/hooks';
const AgoraSwitch = withStyles((theme: Theme) =>
  createStyles({
    root: {
      width: 42,
      height: 26,
      padding: 0,
      borderBottom: '1px solid #bdbdbd',
      opacity: 1,
      borderRadius: '13px'
    },
    switchBase: {
      padding: 1,
      '&$checked': {
        transform: 'translateX(16px)',
        color: theme.palette.common.white,
        '& + $track': {
          backgroundColor: '#44A2FC',
          opacity: 1,
          border: 'none',
        },
      },
      '&$focusVisible $thumb': {
        color: '#52d869',
        border: '6px solid #fff',
      },
    },
    thumb: {
      width: 24,
      height: 24,
    },
    track: {
      borderRadius: 26 / 2,
      border: `1px solid ${theme.palette.grey[400]}`,
      backgroundColor: theme.palette.grey[50],
      opacity: 1,
      transition: theme.transitions.create(['background-color', 'border']),
    },
    checked: {},
    focusVisible: {},
  }),
)(({ classes, ...props }: any) => {
  return (
    <Switch
      focusVisibleClassName={classes.focusVisible}
      disableRipple
      classes={{
        root: classes.root,
        switchBase: classes.switchBase,
        thumb: classes.thumb,
        track: classes.track,
        checked: classes.checked,
      }}
      {...props}
    />
  );
});

type CustomSwitchProps = {
  text: string
  checked: boolean
  handleChange: (evt: any) => any
}

export const CustomSwitch = (props: CustomSwitchProps) => {
  return (
    <Typography component="div">
      <Grid component="label" container alignItems="center" spacing={1}>
        <Grid item>{props.text}</Grid>
        <Grid item>
          <AgoraSwitch checked={props.checked} onChange={props.handleChange} />
        </Grid>
      </Grid>
    </Typography>
  )
}


const useStyles = makeStyles({
  box: {
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    margin: 'auto',
    width: '275px',
    height: '238px',
    zIndex: 33,
  },
  root: {
    minWidth: 275,
    background: '#FFFFFF',
    boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    border: '1px solid #DBE2E5'
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
});

export const CustomCard = observer(() => {
  const classes = useStyles();
  const extensionStore = useExtensionStore()
  return (
    extensionStore.visibleCard ? 
    <Box className={classes.box}>
      <Card className={classes.root} variant="outlined">
        <CardContent>
          <CustomSwitch
            text={t('switch.enable_hands_up')}
            checked={extensionStore.enableCoVideo}
            handleChange={async (evt: any) => {
              await extensionStore.toggleEnableCoVideo()
            }}
          />
          <CustomSwitch
            text={t('switch.enable_auto_hands_up')}
            checked={extensionStore.enableAutoHandUpCoVideo}
            handleChange={async (evt: any) => {
              await extensionStore.toggleEnableAutoHandUpCoVideo()
            }}
          />
        </CardContent>
      </Card>
    </Box> : null
  );
})